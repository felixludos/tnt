class ASender {
  constructor() {
    this.serverData = {};
    this.msgCounter = 0;
    this.stepCounter = 0;
    this.callback = null;
    this.player = '';
    this.backendUrl = "http://localhost:5000/";
  }
  send(url, callback) {
    url = this.backendUrl + url;
    this.msgCounter += 1;
    console.log(this.msgCounter, "request sent: ", url);

    $.ajax({
      url: url,
      type: "GET",
      success: function(response) {
        this.serverData = JSON.parse(response);
        //console.log(this.serverData);
        callback(this.serverData);
      },
      error: function(error) {
        console.log(error);
      }
    });
  }
  augment(data, step) {
    this.stepCounter += 1;
    jQuery.extend(true, this.serverData, data);
    //console.log("this", this);
    console.log("step " + this.stepCounter, this.serverData);
  }
  chainSend(msgChain, player, callback) {
    this.stepCounter = 0;
    this.serverData = {game:{player:player}};
    this.callback = callback;
    this.chainSendRec({}, msgChain, callback);
  }
  chainSendRec(data, msgChain, callback) {
    this.augment(data);
    if (msgChain.length > 0) {
      console.log('sending:',msgChain[0]);
      this.send(msgChain[0], d => this.chainSendRec(d, msgChain.slice(1), callback));
    } else {
      callback(data);
      console.log("done chainSend");
    }
  }
}
