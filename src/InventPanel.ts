import { Game } from "./Game";
import { Item, ItemDefinition } from "./InventItem";
import { Graphics } from "./engine/Graphics";
import { getSprite } from "./engine/Resources";

/**
 * A panel to display the player's inventory.
 */
export class InventPanel {
    /** The position of the thumb hold on the scroll bar */
    thumbPosition: number = 0;
    /** The height of the scroll bar thumb */
    thumbHeight: number = 50;
    /** The location on the screen of the panel */
    panelX: number = 0;
    /** The location on the screen of the panel */
    panelY: number = 0;
    /** The width of the panel */
    panelWidth: number = 0;
    /** The height of the panel */
    panelHeight: number = 0;
    /** The x coordinate of the mouse in screen coordinates */
    mouseX: number = 0;
    /** The y coordinate of the mouse in screen coordinates */
    mouseY: number = 0;
    /** The last x coordinate of the mouse recorded relative to the panel */
    lastMx: number = 0;
    /** The last y coordinate of the mouse recorded relative to the panel */
    lastMy: number = 0;
    /** The game displaying the panel */
    game: Game;
    /** True if the mouse button is currently pressed */
    mousePressed: boolean = false;
    /** True if this panel is currently being rendered to the screen */
    visible: boolean = false;
    /** True if the player is currently holding down the thumb of the scroll bar */
    holdingThumb: boolean = false;
    /** True if the player has dragged an item out of the inventory */
    holdingItem: Item | undefined = undefined;
    /** The offset of the inventory scroller */
    inventOffsetY: number = 0;
    /** The index of the selected item - for key controls */
    selectedItem: number = -1;

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Hide this panel, it will no longer render
     */
    hide(): void {
        this.visible = false;
        this.mousePressed = false;
        this.holdingThumb = false;
        this.holdingItem = undefined;
    }

    /**
     * Show this panel, it will be rendered and take over events.
     */
    show(): void {
        this.visible = true;
    }

    /**
     * Check if this panel is being rendered
     * 
     * @returns True if this panel is being rendered 
     */
    showing(): boolean {
        return this.visible;
    }

    /**
     * Draw this panel to the graphics context
     * 
     * @param g The graphics context on which to render the screen
     */
    draw(g: Graphics): void {
        if (!this.visible) {
            return;
        }

        // center the panel on the screen and work out how 
        // many items to display per row based on screen size
        const space = 300;
        this.panelWidth = Math.min(g.getWidth() - space, 900);
        this.panelHeight = Math.min(g.getHeight() - space, 800);
        const items = this.game.player.inventory;
        const across = Math.floor((this.panelWidth - 120) / 130);
        const down = Math.ceil(items.length / across);

        this.panelX = (g.getWidth() - this.panelWidth) / 2;
        this.panelY = (g.getHeight() - this.panelHeight) / 2;

        // work out the proportion of the thumb scroll that we have
        const totalHeight = (down * 130) - 260;
        let pages = Math.ceil(totalHeight / this.panelHeight);
        this.thumbHeight = ((this.panelHeight - 40) / pages);

        // render the panel
        g.save();
        g.translate(this.panelX, this.panelY);
        g.setFillColor(255, 255, 255, 0.8);
        g.fillRect(0, 0, this.panelWidth, this.panelHeight);

        // draw track
        g.setFillColor(0, 0, 0, 0.5);
        g.fillRect(20, 20, 40, this.panelHeight - 40);
        // draw thumb
        g.setFillColor(0, 0, 0, 0.5);
        g.fillRect(20, 20 + this.thumbPosition, 40, this.thumbHeight);

        let thumbOffset = this.thumbPosition / ((this.panelHeight - 40));
        thumbOffset = thumbOffset === Number.NaN ? 0 : thumbOffset;

        // render the items scrolled based on the scroll bar
        g.save();
        g.clip(0, 0, this.panelWidth, this.panelHeight);
        this.inventOffsetY = -(thumbOffset * totalHeight * pages);
        g.translate(0, this.inventOffsetY);
        let xp = 0;
        let yp = 0;
        for (const item of items) {
            InventPanel.drawItem(this.game, g, item, 100 + (xp * 130), 20 + (yp * 130), items.indexOf(item) === this.selectedItem);

            xp += 1;
            if (xp >= across) {
                xp = 0;
                yp++;
            }
        }
        g.restore();

        g.restore();

        // draw the dragged item if any
        if (this.holdingItem) {
            g.drawScaledImage(getSprite(this.holdingItem.def.sprite), this.mouseX - 45, this.mouseY - 45, 85, 85);
        }
    }

    /**
     * Notification that mouse has been pressed while this panel is on the screen
     * 
     * @param x The x coordinate of the mouse in screen space
     * @param y The y coordinate of the mouse in screen space
     */
    mouseDown(x: number, y: number): void {
        this.mouseX = x;
        this.mouseY = y;

        x -= this.panelX;
        y -= this.panelY;

        // if we've clicked outside of the panel then close it down
        if (x < 0 || y < 0 || x > this.panelWidth || y > this.panelHeight) {
            this.hide();
            this.mousePressed = true;
            return;
        }

        // are we on the thumb?
        if (x >= 20 && x < 60 && y >= 20 && y < this.panelHeight - 20) {
            // we're on the track
            if (y > this.thumbPosition + 20 && y < this.thumbPosition + this.thumbHeight + 20) {
                this.holdingThumb = true;
            } else {
                // we've clicked on the track
                this.thumbPosition = y;
                this.validateThumb();
            }
        } else {
            // are we on the items?
            const items = this.game.player.inventory;
            const across = Math.floor((this.panelWidth - 120) / 130);
            const down = Math.ceil(items.length / across);
            if ((x > 100) && (y > 20) && (x < 100 + (across * 130)) && (y < this.panelHeight - 40)) {
                const ix = Math.floor((x - 100) / 130);
                const iy = Math.floor((y - 20 - this.inventOffsetY) / 130);
                const index = (iy * across) + ix;
                if ((index >= 0) && (index < this.game.player.inventory.length)) {
                    this.holdingItem = this.game.player.inventory[index];
                }
            }
        }

        this.lastMx = x;
        this.lastMy = y;
        this.mousePressed = true;
    }

    /**
     * Notification that mouse has been released while this panel is on the screen
     * 
     * @param x The x coordinate of the mouse in screen space
     * @param y The y coordinate of the mouse in screen space
     */
    mouseUp(x: number, y: number): void {
        // if we're holding an item then let the game know its been dropped
        if (this.holdingItem) {
            this.game.itemDropped(this.holdingItem, x, y);
        }
        this.mousePressed = false;
        this.holdingThumb = false;
        this.holdingItem = undefined;
    }

    static drawItem(game: Game, g: Graphics, item: Item | null, x: number, y: number, selected: boolean): void {
        if (selected) {
            g.drawScaledImage(getSprite("ui/sloton"), x, y, 125, 125);
        } else {
            g.drawScaledImage(getSprite("ui/slotoff"), x, y, 125, 125);
        }

        if (item) {
            g.drawScaledImage(getSprite(item.def.sprite), 20 + x + (item.def.place === 0 ? 7 : 0), 15 + y, 85, 85);

            if (!game.serverSettings.isCreativeMode()) {
                if (Math.ceil(item.count) > 1) {
                    g.drawScaledImage(getSprite("ui/counter"), x, y, 125, 125);
                    g.setFillColor(255, 255, 255, 1);
                    g.setFont("45px KenneyFont");
                    g.setTextAlign("center");
                    g.fillText(Math.ceil(item.count) + "", x + 92, y + 105);
                }

                if (item.def.breakable) {
                    const remaining = item.count - Math.floor(item.count);
                    if (remaining !== 0) {
                        g.setFillColor(0,0,0,0.5);
                        g.fillRect(x+17, y+16, 90, 10);
                        g.setFillColor(0,255,0,0.3);
                        g.fillRect(x+17, y+16, (90 * remaining), 10);
                    }
                }
            }
        }
    }

    /**
     * Notification that mouse has been moved while this panel is on the screen
     * 
     * @param x The x coordinate of the mouse in screen space
     * @param y The y coordinate of the mouse in screen space
     */
    mouseMove(x: number, y: number): void {
        this.mouseX = x;
        this.mouseY = y;

        x -= this.panelX;
        y -= this.panelY;

        // drag the scroll bar around
        if (this.mousePressed) {
            // its a drag
            let dx = x - this.lastMx;
            let dy = y - this.lastMy;

            if (this.holdingThumb) {
                // we're on the thumb
                this.thumbPosition += dy;
                this.validateThumb();
            }
        }

        this.lastMx = x;
        this.lastMy = y;
    }

    /**
     * Validate that the thumb on the scrollbar is actually within the track
     */
    private validateThumb(): void {
        if (this.thumbPosition < 0) {
            this.thumbPosition = 0;
        }
        if (this.thumbPosition > (this.panelHeight - 40) - this.thumbHeight) {
            this.thumbPosition = (this.panelHeight - 40) - this.thumbHeight;
        }
    }

    /**
     * Move the selection to the next item
     */
    nextItem(): void {
        this.selectedItem++;
        if (this.selectedItem >= this.game.player.inventory.length) {
            this.selectedItem = 0;
        }
        this.scrollToSelected();
    }

    /**
     * Move the selection to the previous item
     */
    prevItem(): void {
        this.selectedItem--;
        if (this.selectedItem < 0) {
            this.selectedItem = this.game.player.inventory.length - 1;
        }
        this.scrollToSelected();
    }

    /**
     * Scroll the item view to the selected item
     */
    scrollToSelected(): void {
        // this all feels a bit dodgy, not sure this
        // is right
        const items = this.game.player.inventory;
        const across = Math.floor((this.panelWidth - 120) / 130);
        const down = Math.ceil(items.length / across);
        const totalHeight = (down * 130);
        let pos = Math.floor(this.selectedItem / across) * 130;

        this.thumbPosition = (pos / totalHeight) * this.thumbHeight;
        this.validateThumb();
    }

    /**
     * Notification that the switch layer button has been pressed while this panel is visible
     */
    layer(): void {
        // TOOD - might want to do something else with this button
        // but for now just do trigger
        this.trigger();
    }

    /**
     * Notification that the switch trigger button has been pressed while this panel is visible
     */
    trigger(): void {
        const item = this.game.player.inventory[this.selectedItem];
        if (item) {
            this.game.replaceItem(item);
        }
    }

    /**
     * Notification that the wheel on the mouse has moved while this panel is visible. Adjust scroll bar.
     * 
     * @param delta The amount of the wheel moved
     */
    wheel(delta: number): void {
        this.thumbPosition += delta;
        this.validateThumb();
    }
}