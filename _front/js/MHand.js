class MHand{
  constructor(){
    this.actionCards=[];
    this.investmentCards=[];
    this.playedInvestmentCards=[];
  }
  add(card){
    if (card.type == 'action_card'){
      this.actionCards.push(card);
    }else{this.investmentCards.push(card);}
  }
  play(card){
    console.log('playing card',card)
  }
}