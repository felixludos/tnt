class NPage{
  constructor(mainDiv,actionDeck_area,chat_area,
    command_area,hand_area,investmentDeck_area,
    log_area,openCard_area,prop_area,reserve_area,
    status_area,test_area){
    this.mainDiv=mainDiv;
    
    this.actionDeck_area=actionDeck_area;
    this.chat_area=chat_area;
    this.command_area=command_area;
    this.hand_area=hand_area;
    this.investmentDeck_area=investmentDeck_area;
    this.log_area=log_area;
    this.openCard_area=openCard_area;
    this.prop_area=prop_area;
    this.reserve_area=reserve_area;
    this.status_area=status_area;
    this.test_area=test_area;
  }
  editView(){
    hide(this.chat_area);
    hide(this.log_area)
    hide(this.openCard_area);
    hide(this.command_area);

    show(this.prop_area);
    show(this.reserve_area);
    show(this.hand_area)
    show(this.actionDeck_area);
    show(this.investmentDeck_area);
    show(this.status_area);
    show(this.test_area);

    this.mainDiv.className = 'grid_edit';
  }
  testView(){
    this.mainDiv.className = 'grid_test';
    show(this.reserve_area)
    show(this.log_area)
    show(this.test_area);
    show(this.hand_area)
    show(this.openCard_area);
    show(this.status_area);
    show(this.command_area);

    hide(this.chat_area);
    hide(this.prop_area);
    hide(this.actionDeck_area);
    hide(this.investmentDeck_area);
  }
  gameView(canPlaceUnits=true){
    //show(this.chat_area);
    show(this.command_area);
    show(this.log_area)
    show(this.hand_area)
    show(this.openCard_area);
    show(this.status_area);

    hide(this.test_area);
    hide(this.actionDeck_area);
    hide(this.investmentDeck_area);
    hide(this.prop_area);
    if (canPlaceUnits){
      show(this.reserve_area);
      this.mainDiv.className='grid_game';
    }else{
      hide(this.reserve_area);
      this.mainDiv.className='grid_game_no_reserve';

    }

  }

}