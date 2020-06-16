/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class SimpleActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["l5r", "sheet", "actor"],
            template: "systems/l5r/templates/actor-sheet.html",
            width: 1101,
            height: 738,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
            dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();
        data.dtypes = ["String", "Number", "Boolean"];
        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Rollable abilities.
        html.find('.rollable').click(this._onRoll.bind(this));

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Update Inventory Item
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.getOwnedItem(li.data("itemId"));
            item.sheet.render(true);
        });

        // Delete Inventory Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            this.actor.deleteOwnedItem(li.data("itemId"));
            li.slideUp(200, () => this.render(false));
        });
    }
    /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @private
    */
    _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        if (dataset.roll) {
            let roll = new Roll(dataset.roll, this.actor.data.data);
            let label = dataset.label ? `${dataset.label}` : '';
            roll.roll().toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: label
            });
        }
    }

    /** @override */
    _updateObject(event, formData) {
        // Get actor datas
        const actor = this.object;

        // Update XP
        formData["data.attributes.xp.value"] = actor.data.data.attributes.xp.value;

        Object.entries(actor.data.data.rings).forEach(function(ring) {
            var traits = ['stamina', 'willpower', 'reflexes', 'awareness', 'agility', 'intelligence', 'strength', 'perception'];

            let properties = Object.entries(ring[1]).filter(e => traits.includes(e[0])).forEach(function (trait) {
                const formTraitValue = formData["data.rings." + ring[0] + "." + trait[0] + ".value"];
                const actorTraitValue = actor.data.data.rings[ring[0]][trait[0]].value;
                var traitDiff = formTraitValue - actorTraitValue;

                if (traitDiff >= 1) {
                    for (var i = actorTraitValue; i < formTraitValue; i++) {
                        formData["data.attributes.xp.value"] = formData["data.attributes.xp.value"] - ((i + 1) * 4);
                    }
                } else if (traitDiff <= -1) {
                    for (var i = actorTraitValue; i > formTraitValue; i--) {
                        formData["data.attributes.xp.value"] = formData["data.attributes.xp.value"] + (i * 4);
                    }
                }
            });

            if (ring[0] === 'void') {
                const formRingValue = formData["data.rings." + ring[0] + ".value"];
                const actorRingValue = actor.data.data.rings[ring[0]].value;
                var ringDiff = formRingValue - actorRingValue;

                if (ringDiff >= 1) {
                    for (var i = actorRingValue; i < formRingValue; i++) {
                        formData["data.attributes.xp.value"] = formData["data.attributes.xp.value"] - ((i + 1) * 6);
                    }
                } else if (ringDiff <= -1) {
                    for (var i = actorRingValue; i > formRingValue; i--) {
                        formData["data.attributes.xp.value"] = formData["data.attributes.xp.value"] + (i * 6);
                    }
                }
            }
        });

        // Updated ring value
        formData["data.rings.earth.value"] = Math.min(formData["data.rings.earth.stamina.value"], formData["data.rings.earth.willpower.value"]);
        formData["data.rings.air.value"] = Math.min(formData["data.rings.air.reflexes.value"], formData["data.rings.air.awareness.value"]);
        formData["data.rings.water.value"] = Math.min(formData["data.rings.water.strength.value"], formData["data.rings.water.perception.value"]);
        formData["data.rings.fire.value"] = Math.min(formData["data.rings.fire.agility.value"], formData["data.rings.fire.intelligence.value"]);

        // Update Insight
        formData["data.attributes.insight.value"] = (
            formData["data.rings.earth.value"] +
            formData["data.rings.air.value"] +
            formData["data.rings.water.value"] +
            formData["data.rings.fire.value"] +
            formData["data.rings.void.value"]
            ) * 10;

        // Update rank
        if (formData["data.attributes.insight.value"] >= 1 && formData["data.attributes.insight.value"] <= 149) {
            formData["data.attributes.rank.value"] = 1;
        } else if (formData["data.attributes.insight.value"] >= 150) {
            formData["data.attributes.rank.value"] = Math.floor(((formData["data.attributes.insight.value"] - 150) / 25) + 2);
        }

        // Update the Actor
        return this.object.update(formData);
    }
}