class NPage {
  constructor() {}
  gameView(canPlaceUnits = true) {
    //show(this.chat_area);
    show(this.command_area);
    show(this.log_area);
    show(this.hand_area);
    show(this.openCard_area);
    show(this.status_area);

    hide(this.menu_area);
    hide(this.test_area);
    hide(this.actionDeck_area);
    hide(this.investmentDeck_area);
    hide(this.prop_area);
    if (canPlaceUnits) {
      show(this.reserve_area);
      this.mainDiv.className = "grid_game";
    } else {
      hide(this.reserve_area);
      this.mainDiv.className = "grid_game_no_reserve";
    }
    return this;
  }
  editView() {
    hide(this.chat_area);
    hide(this.log_area);
    hide(this.openCard_area);
    hide(this.command_area);

    show(this.status_area);

    show(this.prop_area);
    show(this.reserve_area);
    show(this.hand_area);
    show(this.actionDeck_area);
    show(this.investmentDeck_area);
    show(this.menu_area);
    show(this.test_area);

    this.mainDiv.className = "grid_edit";
    return this;
  }
  initView() {
    this.mainDiv = document.getElementById("mainDiv");
    this.actionDeck_area = document.getElementById("actionDeck_area");
    this.chat_area = document.getElementById("chat_area");
    this.command_area = document.getElementById("command_area");
    this.hand_area = document.getElementById("hand_area");
    this.investmentDeck_area = document.getElementById("investmentDeck_area");
    this.log_area = document.getElementById("log_area");
    this.menu_area = document.getElementById("menu_area");
    this.openCard_area = document.getElementById("openCard_area");
    this.prop_area = document.getElementById("prop_area");
    this.reserve_area = document.getElementById("reserve_area");
    this.status_area = document.getElementById("status_area");
    this.test_area = document.getElementById("test_area");
    return this;
  }
  testView() {
    this.mainDiv.className = "grid_test";
    show(this.reserve_area);
    show(this.log_area);
    show(this.test_area);
    show(this.hand_area);
    show(this.openCard_area);
    show(this.menu_area);
    show(this.command_area);

    show(this.status_area);
    hide(this.chat_area);
    hide(this.prop_area);
    hide(this.actionDeck_area);
    hide(this.investmentDeck_area);

    return this;
  }
  updateGameView(player, options) {
    //show/hide hand and log
    for (const pl of ["Axis", "USSR", "West"]) {
      let gHand = document.getElementById("handG_" + pl);
      gHand.setAttribute("style", pl == player ? "visibility:visible;" : "visibility:hidden;display:none");
    }

    if (options.log == "individual") {
      for (const pl of ["Axis", "USSR", "West"]) {
        let dLog = document.getElementById("log_" + pl);
        if (pl == player) show(dLog);
        else hide(dLog);
      }
    } else show(document.getElementById("log_all"));
    return this;
  }
}
