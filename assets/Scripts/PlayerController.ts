import { _decorator, Animation, Component, EventMouse, EventTouch, input, Input, log, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export const BLOCK_SIZE = 40;

@ccclass('PlayerController')
export class PlayerController extends Component 
{
    private _startJump: boolean = false;
    private _jumpStep: number = 0;
    private _curJumpTime: number = 0;
    private _jumpTime: number = 0.1;
    private _curJumpSpeed: number = 0;
    private _curPos: Vec3 = new Vec3();
    private _deltaPos: Vec3 = new Vec3(0, 0, 0);
    private _targetPos: Vec3 = new Vec3();

    private _curMoveIndex: number = 0;

    @property(Animation)
    BodyAnim: Animation = null;

    @property({ type: Node })
    leftTouch: Node | null = null;
    @property({ type: Node })
    rightTouch: Node | null = null;

    start() 
    {
        // input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    setInputActive(active: boolean) // PC端适配
    {
        if (active)
        {
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
        else
        {
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
    }
    // setInputActive(active: boolean) // 移动设备适配
    // {
    //     if (active)
    //     {
    //         this.leftTouch?.on(Input.EventType.TOUCH_START, this.onTouch, this);
    //         this.rightTouch?.on(Input.EventType.TOUCH_START, this.onTouch, this);
    //     }
    //     else
    //     {
    //         this.leftTouch?.off(Input.EventType.TOUCH_START, this.onTouch, this);
    //         this.rightTouch?.off(Input.EventType.TOUCH_START, this.onTouch, this);
    //     }
    // }

    onMouseDown(event: EventMouse)
    {
        try
        {
            event.getButton() === 0 ? this.jumpByStep(1) : this.jumpByStep(2);
        }
        catch (e)
        {
            console.log(e);
        }
    }

    onTouch(event: EventTouch)
    {
        const target = event.target as Node;
        if (target?.name == 'LeftTouch')
        {
            this.jumpByStep(1);
        }
        else
        {
            this.jumpByStep(2);
        }
    }

    jumpByStep(step: number)
    {
        if (this._startJump)
            return;

        this._startJump = true;
        this._jumpStep = step;
        this._curJumpTime = 0;
        this._curMoveIndex += step;

        const clipName = step == 1 ? 'oneStep' : 'twoStep';
        const state = this.BodyAnim.getState(clipName);
        if (state == null)
            throw new Error(`${clipName} not found`);
        this._jumpTime = state.duration;

        this._curJumpSpeed = this._jumpStep * BLOCK_SIZE / this._jumpTime;
        this.node.getPosition(this._curPos);
        Vec3.add(this._targetPos, this._curPos, new Vec3(this._jumpStep * BLOCK_SIZE, 0, 0));

        if (this.BodyAnim)
            this.BodyAnim.play(step === 1 ? 'oneStep' : 'twoStep');
    }

    reset()
    {
        this._curMoveIndex = 0;
        this.node.getPosition(this._curPos);
        this._targetPos.set(0, 0, 0);
    }

    onOnceJumpEnd()
    {
        this.node.emit('JumpEnd', this._curMoveIndex);
    }

    update(deltaTime: number)
    {
        if (this._startJump)
        {
            this._curJumpTime += deltaTime; // 累计总的跳跃时间
            if (this._curJumpTime > this._jumpTime)
            { // 当跳跃时间是否结束
                // end 
                this.node.setPosition(this._targetPos); // 强制位置到终点
                this._startJump = false;               // 清理跳跃标记
                this.onOnceJumpEnd();
            }
            else
            {
                // tween
                this.node.getPosition(this._curPos);
                this._deltaPos.x = this._curJumpSpeed * deltaTime; //每一帧根据速度和时间计算位移
                Vec3.add(this._curPos, this._curPos, this._deltaPos); // 应用这个位移
                this.node.setPosition(this._curPos); // 将位移设置给角色
            }
        }
    }
}