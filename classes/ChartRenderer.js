// import PIXI from "../libraries/pixi";

class ChartRenderer {
    /**
     * @param {HTMLCanvasElement} canvas Canvas to draw on
     */
    constructor(canvas) {
        this.renderer = new PIXI.Application({
            view: canvas,
            backgroundColor: 0x111111,
            resizeTo: $("#chartContainer")[0]
        });

        canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        this.fpsText = new PIXI.Text(
            "FPS: ",
            new PIXI.TextStyle({
                fill: "#ffffff",
                fontSize: 12
            })
        );
        this.fpsText.x = 0;
        this.fpsText.y = 0;
        this.renderer.stage.addChild(this.fpsText);

        this.renderer.ticker.add((delta) => {
            this.Tick(delta);
        });
    }

    AddBeat(beat) {

    }

    /**
     * @private
     * Adds beat for rendering
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} division Amount of notes are in beat
     * @returns {PIXI.Container} reference (pixi container)
     */
    AddBeatToRender(x, y, division, emoji) {
        let beat = new PIXI.Container();
        beat.position.set(x, y + 15);

        let bg = new PIXI.Sprite(PIXI.Texture.WHITE);
        bg.position.set(0, 0);
        bg.tint = 0x444444;
        bg.width = division * 56 + 4;
        bg.height = 60;

        beat.addChild(bg);

        for (let i = 0; i < division; i++) {
            let note = new PIXI.Sprite(PIXI.Texture.WHITE);
            note.tint = 0x222222;
            note.position.set(4 + i * 56, 4);
            note.width = 52;
            note.height = 52;

            beat.addChild(note);
        }

        this.renderer.stage.addChild(beat);

        return beat;
    }

    /**
     * @private
     * 
     * @param {Number} delta 
     */
    Tick(delta) {
        this.fpsText.text = `FPS: ${this.renderer.ticker.FPS.toFixed(2)}`;
    }

    /**
     * @private
     * @type {PIXI.Application}
     */
    renderer;

    /**
     * @private
     * @type {PIXI.Text}
     */
    fpsText;
}
