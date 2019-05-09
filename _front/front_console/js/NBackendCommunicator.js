class NBackendCommunicator {
  constructor(backendUrl) {
    this.serverData = null;
    this.backendUrl = backendUrl;
    this.msgCounter = 0;
  }
  post(url, data, callback) {
    url = backendUrl + url;
    this.msgCounter += 1;
    //console.log(this.msgCounter, "POST request sent: ", url, data);
    $.ajax({
      url: url,
      type: "POST",
      data: JSON.stringify(data),
      processData: false,
      contentType: "application/json; charset=UTF-8",
      success: function(response) {
        //console.log(response);
        callback(response);
      },
      error: function(error) {
        //console.log(error);
      }
    });
  }
  sendOrPost(msg, msgParam, data, callback) {
    if (!empty(msgParam)) msg += "/" + msgParam;
    //console.log(this.msgCounter, "HTTP sent: ", msg);
    if (startsWith(msg, "post")) {
      this.post(msg, data, d => callback(d));
    } else {
      this.send(msg, d => callback(d));
    }
  }
  send(url, callback) {
    url = this.backendUrl + url;
    this.msgCounter += 1;
    console.log(this.msgCounter, "request sent: ", url);
    w3.http(url, function() {
      if (this.readyState == 4 && this.status == 200) {
        callback(this.responseText);
      }
    });
  }
}
