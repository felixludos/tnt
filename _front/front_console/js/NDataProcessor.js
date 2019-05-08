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

  processMessage(jsonData, callback = null) {
    //for testing
    //console.log("NDataProcessor:processMessage", jsonData);
    this.serverData = jsonData;
    processLog();
    if (callback) callback(this.serverData);
  }

  //from init to actiontuples etc...
  initGame(player = "West", callback) {
    this.callback = callback;
    this.player = player;
    this.sender.send("init/hotseat/" + player, this.actionStep1.bind(this)); //send init message
  }

  //from action to action or playerChange+action
  action(player, tuple, callback) {
    this.player = player;
    this.callback = callback;
    this.sender.send("action/" + this.player + "/" + tuple.join("+"), this.actionStep1.bind(this));
  }

  actionStep1(data) {
    this.serverData = JSON.parse(data); //save in this.serverdata
    //console.log('step1',this.serverData)
    this.sender.send("info/" + this.player, this.actionStep2.bind(this)); //send info message
  }
  actionStep2(data) {
    data = JSON.parse(data);
    //console.log('step2',data);
    for (const key in data) {
      this.serverData[key] = data[key]; //add data to serverdata
    }
    //console.log(this.serverData);
    this.processLog();
    this.processGameObjects();
    this.serverData.game.player = this.player;
    if ("waiting_for" in this.serverData) {
      let plNext = this.serverData.waiting_for.set[0];
      //console.log('WAITING FOR!!!!',this.serverData.waiting_for);
      this.serverData.game.playerChangedTo = plNext;
      this.sender.send("status/" + plNext, this.actionStep3.bind(this)); //send info message
    } else {
      this.processActions(this.serverData);
      this.callback(this.tuplesInAction, this.gameObjects, this.serverData.game, this.serverData);
    }
  }
  actionStep3(data) {
    //after player change!
    data = JSON.parse(data);
    //console.log('step2',data);
    //console.log('___________________')
    //console.log('data NEW PLAYER',data);
    //console.log('serverData',this.serverData);
    this.processActions(data); //these are the new actions!
    this.callback(this.tuplesInAction, this.gameObjects, this.serverData.game, this.serverData);
  }

  processLog() {
    if ("log" in this.serverData) {
      this.serverData.log = toHTMLString(this.serverData.log);
    }
  }
  processActions(data) {
    //convert serverData to structures needed by frontend:
    // actionTuples, gameObjects, sorted and upToDate, player
    if (!"actions" in data) {
      this.tuplesInAction = [];
      return;
    }
    if ("actions" in data) {
      let tuples = expand(data.actions);
      //problem: wenn a_Tuples nur 1 option hat, dann ist es manchmal (oder immer?)
      //nur eine liste
      //muss daraus list of list machen
      if (!empty(tuples) && !Array.isArray(tuples[0])) {
        console.log(tuples, "vorher");
        tuples = [tuples];
        console.log(tuples, "nachher");
      }

      this.tuplesInAction = tuples;
    }
  }
  processGameObjects() {
    let data = this.serverData;
    let g = {};

    if ("created" in data) {
      for (const id in data.created) {
        let sid = id.toString();
        g[sid] = data.created[id]; //overwride object of have already
      }
    }

    //updated
    if ("updated" in data) {
      for (const id in data.updated) {
        let sid = id.toString();
        //not sure if have to do this really, since possibly no need
        // actually, the object might NOT exist,
        // therefore, just create it if it does not exist!!!

        if (!(sid in g)) {
          //console.log("NON EXISTING:", sid);
          g[sid] = data.updated[id];
        } else {
          let o = g[sid]; //this object should exist since it is being updated!
          //each property of this object should be changed as in data.updated
          let orig = data.updated[id];
          for (const prop in orig) {
            o[prop] = orig[prop];
          }
        }
      }
    }

    this.gameObjects = g;
  }
}
