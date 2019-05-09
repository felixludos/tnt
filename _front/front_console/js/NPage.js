class NPage {
  constructor() {}
  gameView(canPlaceUnits = true) {
    hide(this.menu_area);
    show(this.status_area);
    hide(this.test_area);

    show(this.reserve_area);

    show(this.log_area);
    show(this.command_area);
    hide(this.prop_area);
    hide(this.chat_area);

    show(this.hand_area);

    show(this.cards2_area);
    hideSvg(this.actionDeckG);
    showSvg(this.openCardG);

    show(this.cards3_area);
    hideSvg(this.investmentDeckG);
    showSvg(this.discardedG);
    
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
    show(this.menu_area);
    show(this.status_area);
    show(this.test_area);

    show(this.reserve_area);

    hide(this.log_area);
    hide(this.command_area);
    show(this.prop_area);
    hide(this.chat_area);

    show(this.cards2_area);
    showSvg(this.actionDeckG);
    hideSvg(this.openCardG);

    show(this.cards3_area);
    showSvg(this.investmentDeckG);
    hideSvg(this.discardedG);

    this.mainDiv.className = "grid_edit";
    return this;
  }
  initView() {
    this.mainDiv = document.getElementById("mainDiv");

    this.menu_area = document.getElementById("menu_area");
    this.status_area = document.getElementById("status_area");
    this.test_area = document.getElementById("test_area");

    this.reserve_area = document.getElementById("reserve_area");

    this.map_area = document.getElementById("map_area")

    this.log_area = document.getElementById("log_area");
    this.command_area = document.getElementById("command_area");
    this.prop_area = document.getElementById("prop_area");
    this.chat_area = document.getElementById("chat_area");

    this.hand_area = document.getElementById("hand_area");
    this.cards2_area = document.getElementById("cards2_area");
    this.cards3_area = document.getElementById("cards3_area");

    this.openCardG = document.getElementById("openCardG");
    this.actionDeckG = document.getElementById("actionDeckG");
    this.discardedG = document.getElementById("discardedG");
    this.investmentDeckG = document.getElementById("investmentDeckG");
    

    return this;
  }
  testView() {
    show(this.menu_area);
    show(this.status_area);
    show(this.test_area);

    show(this.reserve_area);

    show(this.log_area);
    show(this.command_area);
    hide(this.prop_area);
    hide(this.chat_area);

    show(this.cards2_area);
    hideSvg(this.actionDeckG);
    showSvg(this.openCardG);

    show(this.cards3_area);
    hideSvg(this.investmentDeckG);
    showSvg(this.discardedG);

    this.mainDiv.className = "grid_test";
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
