import { _decorator, Button, CCInteger, Component, instantiate, Label, math, Node, Prefab, Vec3, Animation, UITransform, AudioSource, AudioClip } from 'cc';
import { BLOCK_SIZE, PlayerController } from './PlayerController';
import { ColorKey } from '../../extensions/plugin-import-2x/creator/components/ColorKey';
const { ccclass, property } = _decorator;

enum BlockType
{
    BT_NONE,
    BT_STONE,
    BT_GOLD,
    BT_END,
};
enum GameState
{
    GS_INIT,
    GS_PLAYING,
    GS_END,
};

@ccclass('GameManager')
export class GameManager extends Component
{

    @property({ type: Prefab })
    public boxPrefab: Prefab | null = null; // 普通地块
    @property({ type: Prefab })
    public endBoxPrefab: Prefab | null = null; // 终点地块
    @property({ type: Prefab })
    public goldBoxPrefab: Prefab | null = null; // 绝赞地块

    @property({ type: CCInteger })
    public roadLength: number = 100;
    private _road: BlockType[] = [];
    private goldNum: number = 0; // 绝赞地块数量
    private goldGet: number = 0; // 已获取绝赞地块数量
    private probGold: string[] = [];

    @property({ type: Node })
    public startMenu: Node | null = null; // 开始UI
    @property({ type: Node })
    public endMenu: Node | null = null; // 结束UI

    @property({ type: PlayerController })
    public playerCtrl: PlayerController | null = null; // 角色控制器
    @property({ type: Label })
    public stepsLabel: Label | null = null; // 计步器
    @property({ type: Label })
    public bestStepsLabel: Label | null = null; // 最佳纪录标签
    private bestSteps: number = 0; // 最佳纪录数值

    @property({ type: Label })
    public StartButton: Label | null = null; // 开始按钮
    @property({ type: Label })
    public ResetButton: Label | null = null; // 重置按钮
    @property({ type: Label })
    public debugModeButton: Label | null = null; // 调试模式按钮
    private debugMode: boolean = false; // 调试模式开关

    @property({ type: Label })
    public EndTitle: Label | null = null; // 结束标题
    @property({ type: Label })
    public BackToMenu: Label | null = null; // 返回菜单
    @property({ type: Label })
    public ReplayMap: Label | null = null; // 重开
    @property(Animation)
    public EndTitleAnim: Animation | null = null; // 结束标题动画

    @property({ type: Label })
    public rank: Label | null = null; // 评级
    @property({ type: Label })
    public rankAcc: Label | null = null; // 评级数值文本
    private rankAccVal: number = 0; // 评级数值%

    @property(AudioSource)
    public bgm: AudioSource | null = null; // bgm
    @property({ type: Label })
    public bgmControl: Label | null = null; // bgm播放暂停
    private isBGMPlaying: boolean = true;

    @property(AudioSource)
    public sfx_btn: AudioSource | null = null; // btn sfx

    start()
    {
        this.debugMode = false;
        this.setCurState(GameState.GS_INIT);
        this.ChangeResolution(1920, 1080);
        this.BMGControl(true);
        this.playerCtrl?.node.on('JumpEnd', this.onPlayerJumpEnd, this);
    }

    BMGControl(isBGMON: boolean, volume: number = 1)
    {
        this.isBGMPlaying = isBGMON;
        this.bgm.volume = volume;
        if (isBGMON)
        {
            this.bgm.play();
            this.bgmControl.string = "BGM[O]";
            this.bgmControl.color = new math.Color(125, 125, 125, 255);
        }
        else
        {
            this.bgm.pause();
            this.bgmControl.string = "BGM[X]";
            this.bgmControl.color = new math.Color(65, 65, 65, 255);
        }
    }

    ChangeResolution(width: number, height: number, anchorX?: number, anchorY?: number)
    {
        const uiTransform = this.getComponent(UITransform);
        uiTransform.width = 200;
        uiTransform.height = 120;
        uiTransform.anchorX = anchorX !== undefined ? anchorX : 0;
        uiTransform.anchorY = anchorY !== undefined ? anchorY : 0.5;
    }

    spawnBlockByType(type: BlockType)
    {
        if (!this.boxPrefab)
        {
            return null;
        }

        let block: Node | null = null;
        switch (type)
        {
            case BlockType.BT_STONE:
                block = instantiate(this.boxPrefab);
                break;
            case BlockType.BT_END:
                block = instantiate(this.endBoxPrefab);
                break;
            case BlockType.BT_GOLD:
                block = instantiate(this.goldBoxPrefab);
                break;
        }

        return block;
    }

    generateRoad()
    {

        this.node.removeAllChildren();

        this._road = [];
        // startPos
        this._road.push(BlockType.BT_STONE);
        this.probGold[0] = "StartPos";

        // 生成随机路面
        for (let i = 1; i < this.roadLength; i++)
        {
            if (this._road[i - 1] === BlockType.BT_NONE)
                this._road.push(BlockType.BT_STONE);
            else
                this._road.push(Math.floor(Math.random() * 2));
        }
        this._road[this.roadLength] = BlockType.BT_END;
        this.probGold[this.roadLength] = "EndPos";

        // 随机添加绝赞地块
        this.goldNum = 0;
        let calcWeight = (box) => 
        {
            switch (box)
            {
                case BlockType.BT_STONE:
                    return 25;
                case BlockType.BT_GOLD:
                    return -15;
                case BlockType.BT_END:
                    return 15;
                default:
                    return -10;
            }
        };
        for (let k = 1; k < this.roadLength; k++)
        {
            if (this._road[k] === BlockType.BT_NONE)
                continue;
            let posWeight = (k / this.roadLength) * 10 + 10; // 位置权重, [10, 20]

            let weight = Math.min(calcWeight(this._road[k - 1]) + calcWeight(this._road[k + 1]), 80);

            let ranNum = Math.random() * 100;
            let box = ranNum < posWeight + weight ? BlockType.BT_GOLD : this._road[k];
            this.probGold[k] = `${posWeight} + ${weight} = ${posWeight + weight} | ranNum: ${ranNum} | ${k}-box: ${box}`;
            this.goldNum += box === BlockType.BT_GOLD ? 1 : 0;
            this._road[k] = box;
        }


        // 创建地图
        for (let j = 0; j < this._road.length; j++)
        {
            let block: Node | null = this.spawnBlockByType(this._road[j]);
            if (block)
            {
                this.node.addChild(block);
                block.setPosition(j * BLOCK_SIZE, 0, 0);
            }
        }


    }

    setCurState(value: GameState)
    {
        switch (value)
        {
            case GameState.GS_INIT:
                this.init();
                break;
            case GameState.GS_PLAYING:
                this.playing();
                break;
            case GameState.GS_END:
                this.end();
                break;
        }
    }

    init() 
    {
        if (this.endMenu)
            this.endMenu.active = false;
        if (this.startMenu)
            this.startMenu.active = true;

        this.stepsLabel.string = '0';   // 将步数重置为0

        this.generateRoad();
        if (this.playerCtrl)
        {
            this.playerCtrl.setInputActive(false);
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }
    }

    playing()
    {
        if (this.startMenu || this.endMenu)
            this.startMenu.active = this.endMenu.active = false;

        if (this.stepsLabel)
            this.stepsLabel.string = '0';   // 将步数重置为0

        this.goldGet = 0; // 重置已获取绝赞地块数量

        this.rankAccVal = 0; // 重置评级
        if (this.rank)
            this.rank.string = this.rankAcc.string = ""; // 重置评级文本
        if (this.EndTitle)
            this.EndTitle.string = ""; // 重置结束标题文本

        if (this.debugMode)
            this.printDebugInfo();

        setTimeout(() =>
        {      //直接设置active会直接开始监听鼠标事件，做了一下延迟处理
            if (this.playerCtrl)
            {
                this.playerCtrl.setInputActive(true);
            }
        }, 0.1);
    }

    end()
    {
        if (this.endMenu)
            this.endMenu.active = true;
        if (this.playerCtrl)
        {
            this.playerCtrl.setInputActive(false);
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }

        this.EndTitleAnim.play("EndTitleMove");

        setTimeout(() =>
        {
            let f = false;
            this.rankAcc.string = this.rankAccVal.toFixed(4) + '%' + ` [G:${this.goldGet}/${this.goldNum}]`;
            if (this.rankAccVal < 10)
                this.rank.string = "D";
            else if (this.rankAccVal < 40)
                this.rank.string = "C";
            else if (this.rankAccVal < 60)
                this.rank.string = "B";
            else if (this.rankAccVal < 70)
                this.rank.string = "A";
            else if (this.rankAccVal < 75)
                this.rank.string = "AA";
            else if (this.rankAccVal < 80)
                this.rank.string = "AAA";
            else if (this.rankAccVal < 85)
                this.rank.string = "S";
            else if (this.rankAccVal < 90)
                this.rank.string = "S+";
            else if (this.rankAccVal < 95)
                this.rank.string = "SS";
            else if (this.rankAccVal < 100)
                this.rank.string = "SS+";
            else if (this.rankAccVal < 100.5)
            {
                this.rank.string = "SSS";
                this.rank.color = new math.Color(172, 255, 126, 255); // green
                this.rankAcc.color = new math.Color(172, 255, 126, 255);
                f = true;
            }
            else 
            {
                this.rank.string = "SSS+";
                this.rank.color = new math.Color(255, 146, 46, 255); // gold
                this.rankAcc.color = new math.Color(255, 146, 46, 255);
                f = true;
            }

            if (!f)
            {
                this.rank.color = new math.Color(255, 255, 255, 255);
                this.rankAcc.color = new math.Color(255, 255, 255, 255);
            }

        }, this.EndTitleAnim.getState("EndTitleMove").duration + 500);
    }

    printDebugInfo()
    {
        for (let b of this.probGold)
            console.log(`${b === undefined ? "AIR" : b}\n`);
    }

    onStartButtonClicked()
    {
        if (this.StartButton)
        {
            this.sfx_btn.play();
            this.ResetButton.string = "Reset";
            this.ResetButton.color = new math.Color(255, 73, 73, 255);
        }
        this.setCurState(GameState.GS_PLAYING);
    }

    onResetButtonClicked()
    {
        this.bestSteps = 0;
        if (this.bestStepsLabel)
            this.bestStepsLabel.string = "No Record!";
        if (this.ResetButton && this.ResetButton.string !== "Start a New Game!")
        {
            this.sfx_btn.play();
            this.ResetButton.string = "Start a New Game!";
            this.ResetButton.color = new math.Color(90, 63, 63, 255);
        }
    }

    onBackToMenuButtonClicked()
    {
        if (this.BackToMenu)
        {
            this.sfx_btn.play();
            if (this.EndTitle)
                this.EndTitle.string = "";
            if (this.rank)
                this.rank.string = "";
            this.setCurState(GameState.GS_INIT);
        }

    }

    onRestartButtonClicked()
    {
        if (this.ReplayMap)
        {
            this.sfx_btn.play();
            if (this.EndTitle)
                this.EndTitle.string = "";
            if (this.rank)
                this.rank.string = "";
            this.setCurState(GameState.GS_PLAYING);
        }

    }

    onPlayerJumpEnd(moveIndex: number)
    {
        if (this.stepsLabel)
        {
            this.stepsLabel.string = '' + (moveIndex >= this.roadLength ? this.roadLength : moveIndex);
        }
        this.checkResult(moveIndex);
    }

    onDebugModeButtonClicked()
    {
        this.debugMode = !this.debugMode;
        if (this.debugModeButton)
        {
            this.sfx_btn.play();
            this.debugModeButton.string = this.debugMode ? "Debug[O]" : "Debug[X]";
            this.debugModeButton.color = this.debugMode ? new math.Color(125, 125, 125, 255) :
                new math.Color(65, 65, 65, 255);
        }
    }

    onBGMButtonClicked()
    {
        this.sfx_btn.play();
        this.BMGControl(!this.isBGMPlaying);
    }

    checkResult(moveIndex: number)
    {
        if (this._road[moveIndex] === BlockType.BT_GOLD)
            this.goldGet++;

        if (moveIndex >= this.roadLength || this._road[moveIndex] === BlockType.BT_END)
        {
            // 胜利
            this.bestSteps = this.roadLength;
            if (this.bestStepsLabel)
                this.bestStepsLabel.string = "Best: CLEARED!";

            this.rankAccVal = (moveIndex / this.roadLength) * 100 + (this.goldGet / this.goldNum); // 计算完成度
            this.EndTitle.string = "CLEAR!";
            this.setCurState(GameState.GS_END);
        }
        else if (this._road[moveIndex] === BlockType.BT_NONE)
        {
            // 失败
            if (moveIndex > this.bestSteps)
                this.bestSteps = moveIndex;
            if (this.bestStepsLabel)
                this.bestStepsLabel.string = this.bestSteps == this.roadLength ? "Best: CLEARED!" : "Best: " + this.bestSteps;

            this.rankAccVal = (moveIndex / this.roadLength) * 100 + (this.goldGet / this.goldNum); // 计算完成度
            this.EndTitle.string = "Game Over!";
            this.setCurState(GameState.GS_END);

        }
    }

    update(deltaTime: number)
    {

    }
}


