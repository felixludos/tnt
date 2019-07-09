class NPage {
  constructor() {
		this.view=null;
	}
  clearAllObjects() {
    clearElementFromChildIndex(document.getElementById("mapG"), 1);
    clearElementFromChildIndex(document.getElementById("handG_West"), 1);
    clearElementFromChildIndex(document.getElementById("handG_Axis"), 1);
    clearElementFromChildIndex(document.getElementById("handG_USSR"), 1);
    clearElementFromChildIndex(document.getElementById("openCardG"), 1);
    clearElement(document.getElementById("divSelect"));
  }
  selectView() {
		if (this.view == 'select') return;
		this.view = 'select';
		hide(this.battle_area);

    show(this.status_area);

    show(this.edit_area);
    //show(this.select_area);
    show(this.command_area);
    show(this.command2_area);

    show(this.map_area);

    show(this.log_area);

    show(this.hand_area);
    show(this.cards2_area);
    hideSvg(this.actionDeckG);
    showSvg(this.openCardG);

    hide(this.cards3_area);
    hideSvg(this.investmentDeckG);
    showSvg(this.discardedG);

    this.mainDiv.className = "grid_game_may";
    return this;
	}
  battleView() {
		if (this.view == 'battle') return;
		this.view = 'battle';
		show(this.battle_area);

    show(this.status_area);

    show(this.edit_area);
    //show(this.select_area);
    show(this.command_area);
    show(this.command2_area);

    show(this.map_area);

    show(this.log_area);

    show(this.hand_area);
    hide(this.cards2_area);
    hideSvg(this.actionDeckG);
    hideSvg(this.openCardG);

    hide(this.cards3_area);
    hideSvg(this.investmentDeckG);
    hideSvg(this.discardedG);

    this.mainDiv.className = "grid_game_battle";
    return this;
	}
	
  initView() {
    this.mainDiv = document.getElementById("mainDiv");

    this.status_area = document.getElementById("status_area");

    this.edit_area = document.getElementById("edit_area");
    //this.select_area = document.getElementById("select_area");

    this.map_area = document.getElementById("map_area");

    this.log_area = document.getElementById("log_area");
    this.command_area = document.getElementById("command_area");
    this.command2_area = document.getElementById("command2_area");

    this.hand_area = document.getElementById("hand_area");
    this.battle_area = document.getElementById("battle_area");
    this.cards2_area = document.getElementById("cards2_area");
    this.cards3_area = document.getElementById("cards3_area");

    this.openCardG = document.getElementById("openCardG");
    this.actionDeckG = document.getElementById("actionDeckG");
    this.discardedG = document.getElementById("discardedG");
    this.investmentDeckG = document.getElementById("investmentDeckG");

    return this;
  }
}
