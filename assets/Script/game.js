/**
 * @author uu
 * @file 游戏控制
 */
cc.Class({
  extends: cc.Component,
  properties: {
    _status: 0, //0 未开始 1 游戏开始 2 游戏暂停 3 游戏结束 4 下落状态 5无法触摸状态
    blockPrefab: cc.Prefab,
    blockSprite: [cc.SpriteFrame] //todo: 换成动态生成
  },
  init(c) {
    this._controller = c
    this.bindNode()
    this.generatePool()
    this._score = c.scoreMgr
    this.rowNum = c.config.json.rowNum
    this.gap = c.config.json.gap
    this.animationSpeed = c.config.json.gap
    this.blockWidth = (730 - (this.rowNum + 1) * this.gap) / this.rowNum
  },
  // 动态获取需要动态控制的组件
  bindNode() {
    this.blocksContainer = this.node.getChildByName('map')
  },
  //---------------- 游戏控制 ---------------------
  // 游戏开始
  gameStart() {
    this._score.init(this)
    this.mapSet(this.rowNum).then((result) => {
      console.log('游戏状态改变', result)
      this._status = 1
    })

  },
  // 初始化地图
  mapSet(num) {
    this.map = new Array()
    let self = this
    return new Promise((resolve, reject) => {
      for (let i = 0; i < num; i++) { //行
        this.map[i] = new Array()
        for (let j = 0; j < num; j++) { //列
          self.map[i][j] = self.instantiateBlock(self, {
            x: j,
            y: i,
            width: self.blockWidth,
            startTime: (i + j + 1) * self._controller.config.json.startAnimationTime / num * 2
          }, self.blocksContainer)
        }
      }
      setTimeout(() => {
          resolve('200 OK');
        }, self._controller.config.json.startAnimationTime * num / 2 / 1
        //  (cc.game.getFrameRate() / 60)
      )
    })
  },

  //防抖动 判断是否需要检测下落
  checkNeedFall() {
    if (this.checkNeedFallTimer) {
      clearTimeout(this.checkNeedFallTimer)
    }
    this.checkNeedFallTimer = setTimeout(() => {
        if (this._status == 5) {
          this.onFall()
        }
      }, 250 / 1
      // (cc.game.getFrameRate() / 60)
    )
  },
  //方块下落
  onFall() {
    let self = this
    this._status = 4
    let canFall = 0
    //算法 
    //从每一列的最下面一个开始往上判断
    //如果有空 就判断有几个空 然后让最上方的方块掉落下来
    for (let j = this.rowNum - 1; j >= 0; j--) {
      for (let i = this.rowNum - 1; i >= 0; i--) {
        if (this.map[i][j].getComponent('cell')._status == 2) {
          this.blockPool.put(this.map[i][j])
          this.map[i][j] = null
          canFall++
        } else {
          if (canFall != 0) {
            this.map[i + canFall][j] = this.map[i][j]
            this.map[i][j] = null
            this.map[i + canFall][j].getComponent('cell').playFallAction(canFall, {
              x: j,
              y: i + canFall,
            })
          }
        }
        if (i == 0) {
          canFall = 0
        }
      }
      if (j == 0) {
        setTimeout(() => {
          this.generateNewBlocks()
        }, 200)
      }
    }
  },
  //防抖动 判断是否需要生成新方块
  checkNeedGenerator() {
    if (this.checkNeedGeneratorTimer) {
      clearTimeout(this.checkNeedGeneratorTimer)
    }
    this.checkNeedGeneratorTimer = setTimeout(() => {
        if (this._status == 4) {
          this.generateNewBlocks()
        }
      }, 250 / 1
      // (cc.game.getFrameRate() / 60)
    )
  },
  //生成新方块
  generateNewBlocks() {
    for (let i = 0; i < this.rowNum; i++) { //行
      for (let j = 0; j < this.rowNum; j++) { //列
        if (!this.map[i][j]) {
          this.map[i][j] = this.instantiateBlock(this, {
            x: j,
            y: i,
            width: this.blockWidth,
            startTime: null
          }, this.blocksContainer)
        }
      }
    }
    this._status = 1
  },
  gameOver() {
    this._status = 3
    this._controller.pageMgr.addPage(2)
    this._controller.pageMgr.addPage(4)
    if (this._controller.social.node.active) {
      // 仅上传分数
      this._controller.social.onGameOver(this._score.score, this._score.level)
    }
  },
  restart() {
    this._controller.pageMgr.onOpenPage(1)
    this.recoveryAllBlocks().then(() => {
      this.gameStart()
    })
  },

  //--------------------- 预制体实例化---------------------
  // 生成对象池
  generatePool() {
    this.blockPool = new cc.NodePool()
    for (let i = 0; i < Math.pow(this.rowNum, 2); i++) {
      let block = cc.instantiate(this.blockPrefab)
      this.blockPool.put(block)
    }
  },
  // 实例化单个方块
  instantiateBlock(self, data, parent) {
    let block = null
    if (self.blockPool && self.blockPool.size() > 0) {
      block = self.blockPool.get()
    } else {
      block = cc.instantiate(self.blockPrefab)
    }
    block.parent = parent
    block.scale = 1
    block.x = 0
    block.y = 0
    block.getComponent('cell').init(self, data, this.blockWidth)
    return block
  },
  // 回收所有节点
  recoveryAllBlocks() {
    return new Promise((resolve, reject) => {
      let children = this.blocksContainer.children
      if (children.length != 0) {
        let length = children.length
        console.log(length)
        for (let i = 0; i < length; i++) {
          this.blockPool.put(children[0])
        }
        for (let i = 0; i < this.rowNum; i++) {
          for (let j = 0; j < this.rowNum; j++) {
            this.map[i][j] = null
          }
        }
      }
      resolve('')
    })
  },
});