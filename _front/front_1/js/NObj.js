class NObj{
  constructor(id,go,page,tab){
    this.id=id;
    this.go=go;
    this.page=page;
    this.tab=tab;
    this.type=type;
    this.elem = tab.type=='svg'?
      document.createElementNS("http://www.w3.org/2000/svg", "g")
      :document.createElement('div');
  }
  button({text='',className=''}){
    let b=document.createElement('button');
    b.textContent=text;
    this.elem.appendChild(b);
    this.tab.appendChild(this.elem);
    return this;
  }
}