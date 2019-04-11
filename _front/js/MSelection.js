class MSelection {
  constructor(info) {
    this.tree = info.tree;
    this.levelTypes = info.typelilevelTypesst;
    this.levelsPerChoice = info.levelsPerChoice;
    this.choiceTypes = info.choiceTypes;
    this.index = 0; // index of selection step, starting with 0: select from children of root
    this.node = this.tree; // parent of selection branch
    this.stack = []; // stack of selections of the form {idlist:idlist,node:node,choiceType:choiceType}
  }
  getChoices(tree = null, branchlen = 0) {
    // returns a list of lists containing ids or partial ids that can be selected according to current
    // selection level
    //console.log('*S*getChoices level: '+this.index);
    if (!tree) tree = this.node;
    if (branchlen == 0) branchlen = this.levelsPerChoice[this.index];
    //this.tree.print();
    let branchlist = tree.branchlist();
    branchlist = branchlist.map(l => l.slice(0, branchlen));
    branchlist = branchlist.map(b => cartesianOf(b)).flat();
    branchlist = branchlist.map(s => s.split("_"));
    //console.log(branchlist[0].toString());
    return branchlist;
  }
  printStack(idlist) {
    console.log("*** stack (" + this.index + ") selected:", idlist.toString());
    let st = last(this.stack);
    if (st) {
      console.log(st.choiceType, st.idlist.toString());
      console.log("node:", st.node.data.toString());
    } else console.log("stack is empty");
    // for (const st of this.stack) {
    //   console.log(st.choiceType, st.idlist.toString());
    //   console.log("node:", st.node.data.toString());
    // }
  }
  processSelection(idlist, typeSelected) {
    //idlist is list of partial types or types involved,
    // corresponding to a branch of tree under this.node;
    //console.log('*** processSelection:',idlist.toString(),typeSelected);
    let t = this.node.findNodes(idlist);
    //console.log('>>>>>>>t=',t);
    this.printStack(idlist);
    let idsToUnselect = [];
    if (!t) {
      //console.log('processSelection: ERROR CANNOT FIND SELECTED NODES');return false;
    }
    //console.log('selected Nodes:');
    //t.map(x=>console.log(x.data.toString()));
    if (typeSelected == this.choiceTypes[this.index]) {
      // new type has been selected
      // travel down branch and increment index.
      // push furthest node involved in choice to stack
      let lastNode = last(t);
      this.stack.push({idlist: idlist, node: this.node, choiceType: typeSelected});
      this.node = lastNode;
      this.index += 1;
    } else {
      let i = this.index;
      while (i > 0 && typeSelected != this.choiceTypes[i]) {
        let top = this.stack.pop();
        idsToUnselect.push(top.idlist);
        i -= 1;
      }
      this.index = i + 1;
      this.node = this.tree.findNodes(idlist)[0];
      this.stack.push({idlist: idlist, node: this.node, choiceType: typeSelected});
      //console.log('typeSelected=',typeSelected)
      //console.log('index=',this.index,'choiceTypes=',this.choiceTypes.toString())
      //console.log('node=',this.node.data.toString())
      if (typeSelected != this.choiceTypes[i]) {
        //console.log('processSelection: IMPOSSIBLE: NO TYPE FITS ',typeSelected);
      }
    }
    this.printStack(idlist);
    //console.log("end");
    return {isCompleted: typeSelected == last(this.choiceTypes), idsToUnselect: idsToUnselect};
  }
  getSelectedNodeLabels() {
    return this.stack.map(x => x.idlist);
  }
}
