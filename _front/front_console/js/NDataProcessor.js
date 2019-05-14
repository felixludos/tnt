class NDataProcessor {
  constructor(backendUrl) {
    this.callback = null;
    this.serverData = null;
    this.player = "";
    this.tuplesInAction = [];
    this.gameObjects = {};
    this.backendUrl = backendUrl;
    this.msgCounter = 0; //not used
    this.sender = new NBackendCommunicator("http://localhost:5000/");
    //this.sender.sendOrPost('initWest'); //test
  }
  //action
  action(player, tuple, callback) {
    this.player = player;
    this.callback = callback;
    this.sender.send("action/" + this.player + "/" + tuple.join("+"), this.actionStep1.bind(this));
  }
  actionStep1(data) {
    this.serverData = data;
    //console.log("___step1", this.serverData);
    this.sender.send("info/" + this.player, this.actionStep2.bind(this)); //send info message
  }
  actionStep2(data) {
    //console.log("actionStep 2: raw info data:", data);
    this.augmentServerData(data, 2);
    if ("waiting_for" in this.serverData) {
      let plNext = this.serverData.waiting_for.set[0];
      //console.log('WAITING FOR!!!!',this.serverData.waiting_for);
      this.serverData.game.playerChangedTo = plNext;
      this.sender.send("status/" + plNext, this.actionStep3.bind(this)); //send info message
    } else {
      this.processServerData();
    }
  }
  actionStep3(data) {
    this.augmentServerData(data, 3);
    //console.log("raw status data:", data);
    this.processServerData();
  }
  augmentServerData(data, step) {
    //console.log('this',this);
    jQuery.extend(true, this.serverData, data);
    //console.log("step " + step, this.serverData);
  }
  //init
  initGame(player, callback) {
    this.callback = callback;
    this.player = player;
    this.sender.send("init/hotseat/" + player, this.actionStep1.bind(this)); //send init message
  }
  //load 'init_complete', setup_complete','production_complete', 'gov_complete'
  loadGame(player, filename, callback) {
    this.callback = callback;
    this.filename = filename;
    this.player = player;
    this.sender.send("myload/" + this.filename + ".json", this.loadStep3.bind(this), this.player);
    //    this.sender.send("init/hotseat/" + player, this.loadStep1.bind(this), player);
  }
  loadStep1(data) {
    //console.log('loadStep1 data (thrown away?!):',data)
    this.serverData = data;
    this.sender.send("myload/" + this.filename + ".json", this.loadStep2.bind(this), this.player);
  }
  loadStep2(data) {
    //console.log(data);//these are the data of refresh call
    if (!this.serverData) this.serverData = {};
    this.serverData.created = data;
    this.sender.send("info/" + this.player, this.actionStep2.bind(this));
  }

  loadStep3(data) {
    //bekomme refresh data hier!
    if (!this.serverData) this.serverData = {};
    this.serverData.created = data;
    this.sender.send("info/" + this.player, this.loadStep4.bind(this));
  }
  loadStep4(data) {
    this.augmentServerData(data, 3);
    this.sender.send("status/" + this.player, this.loadStep5.bind(this));
  }
  loadStep5(data) {
    this.augmentServerData(data, 3);
    //this.sender.send("info/" + this.player, this.loadStep5.bind(this));
  }

  processActions() {
    //convert serverData to structures needed by frontend:
    // actionTuples, gameObjects, sorted and upToDate, player
    let data = this.serverData;
    if (!"actions" in data) {
      this.tuplesInAction = [];
    } else {
      let tuples = expand(data.actions);
      //problem: wenn a_Tuples nur 1 option hat, dann ist es manchmal (oder immer?)
      //nur eine liste
      //muss daraus list of list machen
      if (!empty(tuples) && tuples.length == 1 && !Array.isArray(tuples[0])) {
        //console.log(tuples, "vorher");
        tuples = [tuples];
        //console.log(tuples, "nachher");
      }

      this.tuplesInAction = tuples;
    }
  }
  processLog() {
    if ("log" in this.serverData) {
      this.serverData.log = toHTMLString(this.serverData.log);
    }
  }
  processGameObjects() {
    let data = this.serverData; // komplett bis step 2
    //console.log(this.serverData);
    let g = {};

    if ("created" in data) {
      for (const id in data.created) {
        let sid = id.toString();
        g[sid] = data.created[id]; //overwride object of have already
      }
    }
    if ("updated" in data) {
      for (const id in data.updated) {
        let sid = id.toString();
        g[sid] = data.updated[id];
      }
    }
    this.gameObjects = g;
    return;
  }
  processMessage(jsonData, callback = null) {
    //for testing
    //console.log("NDataProcessor:processMessage", jsonData);
    this.serverData = jsonData;
    processLog();
    if (callback) callback(this.serverData);
  }
  processServerData() {
    //console.log('*** processServerData ***')

    this.processLog();
    //console.log('*** nach log ***')
    this.processGameObjects(); //integrates update and create!
    //console.log('*** nach objects ***')
    this.serverData.game.player = this.player;
    //console.log('*** nach player ***')
    this.processActions();
    // //console.log('*** dp vor callback ***');
    // //console.log('tuples',this.tuplesInAction);
    // //console.log('gameObjects',this.gameObjects);
    //console.log('serverData augmented',this.serverData);
    this.callback(this.tuplesInAction, this.gameObjects, this.serverData.game, this.serverData);
  }
}
