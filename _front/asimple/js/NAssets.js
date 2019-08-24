class NAssets {
  constructor() {
    this.tilePositions = {};
    this.tileNames;
    this.trackPositions = {};
    this.nationPositions = {};
		this.nationNames;
    this.unitCountInfo;
    this.nationalityNames;
    this.unitTypeNames;
    this.factionSetup;
    this.factionNames;
		this.uniqueIdCounter = 0;
		let neutralColor = [230,230,120];//[233, 138, 134];
    this.troopColors = {
      Germany: [174, 174, 176],
      Britain: [86, 182, 222],
      France: [121, 200, 205],
      USSR: [233, 138, 134],
      USA: [145, 186, 130],
      Italy: [174, 172, 131],
      Neutral: neutralColor,
      Minor: neutralColor,
      Major: neutralColor,
      Axis: [174, 174, 176],
      West: [86, 182, 222]
    };
    this.SZ = {
      //various sizes used
      tile: 180,
      pAxis: {x: 0, y: 50}, // this is where on the region placement of cadre is started
      pWest: {x: -50, y: -30},
      pUSSR: {x: +50, y: -30},
      cadrePrototype: 60,
      sumCadre: 60,
      cadreDetail: 44,
      cardWidth: 100,
      cardHeight: 150,
      gap: 10,
			chip: 40,
			nation:130,
      influence: 40
    };
    this.uid2id = {};
    this.id2uid = {};
    this.phaseNames = [
      "Setup",
      "New_Year",
      "Production",
      "Government",
      "Spring",
      "Summer",
      "Blockade",
      "Fall",
      "Winter",
      "Satellite",
      "Movement",
      "Combat",
      "Supply",
      "Retreat",
      "Land_Battle",
      "Sea_Battle",
      "Scoring"
    ];
	}
	distanceBetweenTiles(tilename1,tilename2){
		let pos1=this.tilePositions[tilename1];
		let pos2=this.tilePositions[tilename2];
		return dSquare(pos1,pos2);
	}
  initAssets(map, callback) {
    //console.log("loading...");
    this.calculateTrackPositions();
    loadYML("/a/assets/config/map_pos.yml", data => {
      this.tilePositions = {};
      for (const idTile in data) {
        let id = replaceAll(idTile, " ", "_");
        this.tilePositions[id] = data[idTile];
      }
      this.tileNames = Object.keys(this.tilePositions);
      loadYML("/a/assets/config/nations.yml", data => {
        this.nationPositions = {};
        for (const idNation in data) {
          let id = replaceAll(idNation, " ", "_");
          this.nationPositions[id] = data[idNation];
        }
				//this.nations = this.drawNationPositions();
        this.nationNames = Object.keys(this.nationPositions);
        loadYML("/a/assets/config/unit_count.yml", data => {
          this.unitCountInfo = data;
          this.nationalityNames = Object.keys(data);
          this.unitTypeNames = Object.keys(data["Germany"]);

          loadYML("/a/assets/config/faction_setup.yml", data => {
            this.factionSetup = data;
            this.factionNames = Object.keys(data);
            //console.log("...finished loading assets!");
            callback();
          });
        });
      });
    });
  }
  calculateTrackPositions() {
    let arr = [];
    let x = 580;
    let y = 2120;
    for (let i = 0; i < 25; i++) {
      arr.push({x: x, y: y});
      x += 66;
    }
    this.trackPositions.Axis = arr;

    arr = [];
    x = 1310;
    y = 76;
    for (let i = 0; i < 20; i++) {
      arr.push({x: x, y: y});
      x -= 66;
    }
    for (let i = 20; i < 25; i++) {
      arr.push({x: x, y: y});
      y += 66;
    }
    this.trackPositions.West = arr;

    arr = [];
    x = 2210;
    y = 76;
    for (let i = 0; i < 18; i++) {
      arr.push({x: x, y: y});
      x += 66;
    }
    for (let i = 18; i < 25; i++) {
      arr.push({x: x, y: y});
      y += 66;
    }
    this.trackPositions.USSR = arr;
  }
  clear() {
    this.uid2id = {};
    this.id2uid = {};
    this.uniqueIdCounter = 0;
	}
	drawNationPositions() {
		unitTestFilterNation('drawNationPositions starting');
		let nationDict = {};
    for (const id in this.nationPositions) {
      let pos = this.nationPositions[id];
      let sz = this.SZ.nation;
      let ms = new MS(id, "mapG", this.getUniqueId(id))
        .circle({className: "overlay nation", sz: sz})
        .setPos(pos.x, pos.y)
        .draw();

				nationDict[id] = ms;
    }
		unitTestFilterNation(nationDict);
		return nationDict;
  }

  getUniqueId(id) {
    let uid = this.uniqueIdCounter + "_" + id;
    this.uniqueIdCounter += 1;
    this.uid2id[uid] = id;
    this.id2uid[id] = uid;
    return uid;
  }
}
