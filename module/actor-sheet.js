import { CONFIG as L5RCONFIG } from './config.js';

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
            width: 1107,
            height: 888,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
            dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();
        data.dtypes = ["String", "Number", "Boolean"];
        
        // Order skills by name
        let orderedSkills = {};
        Object.entries(data.data.skills).sort(function(a, b) {
            var x = a[1]["name"]; var y = b[1]["name"];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }).forEach(function (key) {
            orderedSkills[key[0]] = key[1];
        });

        data.data.skills = orderedSkills;

        data.user = game.user;

        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Rollable abilities.
        html.find('.rollable').click(this._onRoll.bind(this));

        // // Everything below here is only needed if the sheet is editable
        // if (!this.options.editable) return;

        // // Update Inventory Item
        // html.find('.item-edit').click(ev => {
        //     const li = $(ev.currentTarget).parents(".item");
        //     const item = this.actor.getOwnedItem(li.data("itemId"));
        //     item.sheet.render(true);
        // });

        // // Delete Inventory Item
        // html.find('.item-delete').click(ev => {
        //     const li = $(ev.currentTarget).parents(".item");
        //     this.actor.deleteOwnedItem(li.data("itemId"));
        //     li.slideUp(200, () => this.render(false));
        // });

        // JavaScript Listener
        let tabValue = this.actor.data.data.others.current_tab;
        let nav = $('.tabs[data-group="primary"]');

        new Tabs(nav, {
          initial: tabValue,
          callback: t => this.object.data.data.others.current_tab = t[0].dataset.tab
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
        const campaignEarth = 3;

        // Set XP value for modifications
        if (typeof formData["data.attributes.xp.value"] == 'undefined') {
            formData["data.attributes.xp.value"] = actor.data.data.attributes.xp.value;
        }

        // Update skills roll and XP
        Object.entries(actor.data.data.skills).forEach(function(skill) {
            let skillName = skill[0];
            let skillObject = skill[1];

            // Set skill roll value
            formData["data.skills." + skillName + ".roll"] = 
                (formData["data.skills." + skillName + ".value"] + formData["data." + L5RCONFIG.paths[actor.data.data.skills[skillName].trait] + ".value"]);

            // Set skill keep value
            formData["data.skills." + skillName + ".keep"] = formData["data." + L5RCONFIG.paths[actor.data.data.skills[skillName].trait] + ".value"];

            // Update XP
            let currentSkillValue = actor.data.data.skills[skillName].value;
            let formSkillValue = formData["data.skills." + skillName + ".value"];

            if (formSkillValue > currentSkillValue) {
                formData["data.attributes.xp.value"] -= (formSkillValue * (formSkillValue + 1) / 2) - (currentSkillValue * (currentSkillValue + 1) / 2);
            } else if (formSkillValue < currentSkillValue) {
                formData["data.attributes.xp.value"] += (currentSkillValue * (currentSkillValue + 1) / 2) - (formSkillValue * (formSkillValue + 1) / 2);
            }
        });

        // Update XP
        Object.entries(actor.data.data.rings).forEach(function(ring) {
            var traits = ['stamina', 'willpower', 'reflexes', 'awareness', 'agility', 'intelligence', 'strength', 'perception'];

            let properties = Object.entries(ring[1]).filter(e => traits.includes(e[0])).forEach(function (trait) {
                const formTraitValue = formData["data.rings." + ring[0] + "." + trait[0] + ".value"];
                const actorTraitValue = actor.data.data.rings[ring[0]][trait[0]].value;
                var traitDiff = formTraitValue - actorTraitValue;

                if (traitDiff >= 1) {
                    for (var i = actorTraitValue; i < formTraitValue; i++) {
                        formData["data.attributes.xp.value"] -= ((i + 1) * 4);
                    }
                } else if (traitDiff <= -1) {
                    for (var i = actorTraitValue; i > formTraitValue; i--) {
                        formData["data.attributes.xp.value"] += (i * 4);
                    }
                }
            });

            if (ring[0] === 'void') {
                const formRingValue = formData["data.rings." + ring[0] + ".value"];
                const actorRingValue = actor.data.data.rings[ring[0]].value;
                var ringDiff = formRingValue - actorRingValue;

                if (ringDiff >= 1) {
                    for (var i = actorRingValue; i < formRingValue; i++) {
                        formData["data.attributes.xp.value"] -= ((i + 1) * 6);
                    }
                } else if (ringDiff <= -1) {
                    for (var i = actorRingValue; i > formRingValue; i--) {
                        formData["data.attributes.xp.value"] += (i * 6);
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

        // Update HP
        formData["data.character.health.max"] = (5 * formData["data.rings.earth.value"]) + (7 * formData["data.rings.earth.value"] * campaignEarth);

        let hpDiff = formData["data.character.health.max"] - formData["data.character.health.value"];

        if (hpDiff <= (5 * formData["data.rings.earth.value"])) {
            formData["data.character.health.rank"] = 1;
            formData["data.character.health.penalty"] = 0;
        } else {
            formData["data.character.health.rank"] = Math.floor((hpDiff + 1) / (formData["data.rings.earth.value"] * campaignEarth));

            if (formData["data.character.health.rank"] == 2) {
                formData["data.character.health.penalty"] = -3;
            } else if (formData["data.character.health.rank"] >= 3 && formData["data.character.health.rank"] <= 6) {
                formData["data.character.health.penalty"] = (formData["data.character.health.rank"] - 2) * -5;
            } else if (formData["data.character.health.rank"] == 7) {
                formData["data.character.health.penalty"] = -40;
            } else {
                formData["data.character.health.penalty"] = "Mourant";
            }
        }

        // Update the Actor
        return this.object.update(formData);
    }
}