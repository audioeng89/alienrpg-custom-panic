// ===========================
// Alien RPG Custom Panic Overhaul Mod
// Main script
// ===========================
const moduleName = 'alienrpg-custom-panic'

// Register options for the Main Settings Menu
Hooks.once('init', () => {
    // Specify a custom Panic Table
    // Whether to automatically apply panic stat mods from table results
    game.settings.register(moduleName, "statAutoApply", {
        name: "Auto-apply Panic Stats",
        hint: "Apply panic table stat mods automatically where text conforms to the standard: capitalized attribute followed immediately by a number modifier. For example: STRESS+2, AGILITY-1, STRENGTH-1, etc.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
    
    // Core Panic Table Name
    game.settings.register(moduleName, "panicTableName", {
        name: "Panic Table Name",
        hint: "Name of the RollTable to use for panic effects.",
        scope: "world",
        config: true,
        type: String,
        default: "Panic Table"
    });

    // Custom dice formula for panic rolls (default 1d6)
    game.settings.register(moduleName,"panicRollFormula", {
        name: "Panic Roll Formula",
        hint: `Enter a dice formula. You can reference actor data with @paths. Default: 1d6 + @header.stress.value`,
        scope: "world",
        config: true,
        type: String,
        default: "1d6 + @header.stress.value"
    });

    // Threshold above which panic is triggered
    game.settings.register(moduleName, "panicThreshold", {
        name: "Panic Threshold",
        hint: "A roll result above this threshold assigns the panic condition to the actor.",
        scope: "world",
        config: true,
        type: Number,
        default: 6,
        onChange: value => {
            if (value <= 0) {
                ui.notifications.warn("Panic Threshold must be greater than zero!");
                game.settings.set(moduleName, "panicThreshold", 1);
            }
        }
    });

    // Threshold at which permanent trauma occurs
    game.settings.register(moduleName, "permanentTraumaThreshold", {
        name: "Permanent Trauma Threshold",
        hint: "The limit at which permanent mental trauma occurs. Displays the relevant chat message at and above this level.",
        scope: "world",
        config: true,
        type: Number,
        default: 12,
        onChange: value => {
            if (value <= 0) {
                ui.notifications.warn("Trauma Threshold must be greater than zero!");
                game.settings.set(moduleName, "permanentTraumaThreshold", 1);
            }
        }
    });

    // Hard cap at which PCs go catatonic
    game.settings.register(moduleName, "catatonicThreshold", {
        name: "Catatonic Trauma Threshold",
        hint: "The maximum limit of panic at which a PC goes Catatonic (auto-applies Unconscious).",
        scope: "world",
        config: true,
        type: Number,
        default: 15,
        onChange: value => {
            if (value <= 0) {
                ui.notifications.warn("Catatonic Trauma Threshold must be greater than zero!");
                game.settings.set(moduleName, "catatonicThreshold", 1);
            }
        }
    });

    // Spaceship Panic Table Name
    game.settings.register(moduleName, "spacePanicTableName", {
        name: "Space Combat Panic Table Name",
        hint: "Name of the RollTable to use for space combat panic effects.",
        scope: "world",
        config: true,
        type: String,
        default: "Space Combat Panic Roll"
    });

    // Custom dice formula for spaceship panic rolls (default 1d6)
    game.settings.register(moduleName,"spacePanicRollFormula", {
        name: "Space Combat Panic Roll Formula",
        hint: `Enter a dice formula. You can reference actor data with @paths. Default: 1d6 + @header.stress.value`,
        scope: "world",
        config: true,
        type: String,
        default: "1d6 + @header.stress.value"
    });

    // Threshold above which panic is triggered aboard a spaceship
    game.settings.register(moduleName, "spacePanicThreshold", {
        name: "Space Combat Panic Threshold",
        hint: "A roll result above this threshold assigns the panic condition to the actor during space combat panic.",
        scope: "world",
        config: true,
        type: Number,
        default: 6,
        onChange: value => {
            if (value <= 0) {
                ui.notifications.warn("Panic Threshold must be greater than zero!");
                game.settings.set(moduleName, "spacePanicThreshold", 1);
            }
        }
    });

    // Register a settings submenu for reset
    game.settings.registerMenu(moduleName, "resetMenu", {
        name: "Reset Settings",
        label: "Reset Panic to Defaults",
        hint: "Click to reset all Alien RPG Custom Panic settings to their default values.",
        icon: "fas fa-undo",  // font awesome icon
        type: ResetSettingsForm,
        restricted: true
    });
});


// ===========================
// Main hook on ready
// Overrides actor methods
// ===========================
Hooks.on("ready", function() {
    if (!game.modules.get('lib-wrapper')?.active) {
        ui.notifications.error("Alien RPG Custom Panic requires the 'libWrapper' module to be installed and enabled.");
        return;
    }
    console.log("AlienRPG Custom Panic | ready workflow");

    // Grab actor prototype so we can override core methods
    const actorProto = Object.getPrototypeOf(game.actors.contents[0]);

    // --- Override rollAbility to add panic interception
    libWrapper.register(moduleName, 'CONFIG.Actor.documentClass.prototype.rollAbility', async function (wrapped, ...args) {
        console.log("rollAbility called with:", args);
        const actor = args[0];
        const dataset = args[1];
        if (!dataset.panicroll) {
            console.info("AlienRPG Panic | rollAbility - intercepted but not panic roll.");
            return wrapped(...args);   // Only override for PCs
        }  
        console.info("AlienRPG Panic | rollAbility - Panic intercepted!", this, args);
            
        // 1. Get variables depending on panic and actor types
        let tableName = game.settings.get(moduleName, "panicTableName");
        let dice = game.settings.get(moduleName,"panicRollFormula");
        const stressmodif = Number(dataset.stressMod) || 0;
        let panicThresh = game.settings.get(moduleName, "panicThreshold") || 6;
        let catThresh = game.settings.get(moduleName, "catatonicThreshold") || 15;
        
        if (dataset.shippanicbut || this.type == "spacecraft"){     // this is a panic roll from a spaceship
            tableName = game.settings.get(moduleName, "spacePanicTableName");
            dice = game.settings.get(moduleName,"spacePanicRollFormula");
            panicThresh = game.settings.get(moduleName, "spacePanicThreshold") || 6;
            catThresh = 1000;
        }

        // 1.5 Check table actually exists before we do anything else
        const table = game.tables.getName(tableName);
        if (!table) {
            ui.notifications.error(`Panic table "${tableName}" not found. Check your settings.`);
            console.error(`AlienRPG Custom Panic | Table "${tableName}" not found.`);
            return '';
        }

        // 2. Roll the dice
        const roll = await new Roll( dice, actor.getRollData() ).evaluate();

        // 3. Compute final panic total
        const rawTotal  = roll.total + stressmodif;
        const rollTotal = Math.max(0, rawTotal);
        console.info("AlienRPG Custom Panic | Rolled Panic [roll + mod = total]:", roll.total, stressmodif, rollTotal);

        // 4. Calculate potential "more panic" before drawing from table
        let new_panic = rollTotal;
        let currentStress = 0;
        if (actor.type !== "synthetic"){    // Syths can't panic
            console.info("Actor is not a Synth");
            // Logic to determine new panic value
            const panic_old = actor.system.general.panic.lastRoll ?? 0;
            const isPanicked = await actor.hasCondition('panicked');
            currentStress = actor.system.header.stress.value ?? 0;

            if (isPanicked) {
                console.info(`Already panicked (last: ${panic_old}), new roll: ${new_panic}`);
                if (new_panic <= panic_old) {
                new_panic = panic_old + 1;    // step up panic by +1 if already panicked
                console.info(`New panic roll not higher, escalating to: ${new_panic}`);
                }
            } else if (new_panic > panicThresh) {
                console.info(`Panic triggered! Roll: ${new_panic} exceeds threshold: ${panicThresh}`);
                await actor.addCondition('panicked');  // new panic
            } else {
                console.info(`No panic. Roll: ${new_panic}, threshold: ${panicThresh}`);
            }

            new_panic = Math.min(new_panic, catThresh);
            new_panic = Math.max(0, new_panic);
            await actor.update({
                'system.general.panic.value': new_panic,     // save new panic settings in sheet
                'system.general.panic.lastRoll': new_panic
            });
        }
        
        // 5. Draw from the panic table
        const result = await table.draw({ roll: new Roll(`${new_panic}`), displayChat: false });
        const text = result.results[0]?.text ?? "No result";
        foundry.audio.AudioHelper.play({src: CONFIG.sounds.dice}, true);    // play dice sound

        // 6. Handle stat effects from table text
        const autoApply = game.settings.get(moduleName, "statAutoApply");
        if (autoApply && actor.type !== "synthetic") {
            const atr_effects = parseEffectsFromText(text, attribute_map); // get effects from text using REGEX (must confirm to STRENGTH+1, STRESS-1, etc)
            const skill_effects = parseEffectsFromText(text, skill_map);

            const modifiersToApply = {};
            let stressMod = 0;
            let healthMod = 0;

            // Handle stress and health attrib mods and pop them from list
            if (atr_effects["stress"] !== undefined) {
                stressMod = atr_effects["stress"];
                delete atr_effects["stress"];
                const newStress = Math.max(currentStress + stressMod, 0);
                await actor.update({ 'system.header.stress.value': newStress });
                console.info(`Updated STRESS from ${currentStress} to ${newStress}`);
            }
            if (atr_effects["health"] !== undefined) {
                healthMod = atr_effects["health"];
                delete atr_effects["health"];
                const currentHealth = actor.system.header.health.value ?? 0;
                const tempHealth = Math.max(currentHealth + healthMod, 0);
                const newHealth = Math.min(tempHealth, actor.system.header.health.max)
                await actor.update({ 'system.header.health.value': newHealth });
                console.info(`Updated HEALTH from ${currentHealth} to ${newHealth}`);
            }

            // Apply unconcious status if Catatonic
            if (new_panic >= catThresh && !dataset.shippanicbut) {
                await actor.toggleStatusEffect('unconscious', { active: true });
            }

            // Create a label for our item. Grab the first <b>…</b> or fall back
            // Only match a <b>…</b> if it’s at the very start (ignoring leading spaces)
            // capture up until—but not including—any trailing punctuation before </b>
            const boldMatch = text.match(/^\s*<b>([\s\S]*?)[\.,;:!?\-]*<\/b>/i);

            // If we got a match, use its contents; otherwise fallback
            const rawLabel  = boldMatch ? boldMatch[1] : "status change";
            const shortLabel = sentenceCase(rawLabel);

            if (Object.keys(atr_effects).length > 0 || Object.keys(skill_effects).length > 0) {
                let itemData = {
                    type: 'item',
                    img: 'systems/alienrpg/images/panic.webp',
                    name: `Panic Effect: ${shortLabel}`,
                    'system.header.type.value': 5,
                    'system.attributes.comment.value': text,
                    'system.header.active': true,
                };

                // Apply attribute modifiers
                for (const [stat, mod] of Object.entries(atr_effects)) {
                    itemData[`system.modifiers.attributes.${stat}.value`] = mod;
                }

                // Apply skill modifiers
                for (const [stat, mod] of Object.entries(skill_effects)) {
                    itemData[`system.modifiers.skills.${stat}.value`] = mod;
                }

                await actor.createEmbeddedDocuments('Item', [itemData]);
                console.log("Panic Item Data:", itemData);
            } else {
                console.info("No modifiers to apply, skipping item creation.");
            }
        }

        // 7. Build and send chat message
        let real_roll = rollTotal - currentStress;
        let chatContent = `
        <h2 style="display: flex; justify-content: space-between; align-items: center;">
            Rolling Panic 
            <span style="font-size: 0.7em;">[Roll: ${real_roll}, Stress: ${currentStress}]</span>
        </h2>
        ${await actor.hasCondition('panicked') ? `
            <h3><b>Panic Level: ${new_panic}</b>
            ${new_panic > rollTotal ? ' - Increased' : ''}
            </h3>` : ''}
        <p>${text}</p>
        ${new_panic >= game.settings.get(moduleName, "permanentTraumaThreshold") && !dataset.shippanicbut ? `
            <img src="systems/alienrpg/images/icons/warning-bar.webp">
            <b>${game.i18n.localize('ALIENRPG.PermanantTrauma')}</b>
            <i>(${game.i18n.localize('ALIENRPG.Seepage106')})</i>` : ''}
        `;

        let rollMode = game.settings.get('core', 'rollMode');
        let whisper = [];
        let blind = false;

        if (rollMode === "gmroll" || rollMode === "blindroll") {
            whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        }
        if (rollMode === "selfroll") {
            whisper = [game.user.id];
        }
        if (rollMode === "blindroll") {
            blind = true;
        }

        await ChatMessage.create({  // send chat message
            content: chatContent,
            speaker: ChatMessage.getSpeaker({ actor: actor}),
            whisper,
            blind
        });

        console.info("AlienRPG Custom Panic | Panic resolved:", text);
        return text;
    }, 'MIXED');
    console.info("AlienRPG Custom Panic | rollAbility successfully overridden.");


    // --- Override checkAndEndPanic to clear old panic effects
    libWrapper.register(moduleName, 'CONFIG.Actor.documentClass.prototype.checkAndEndPanic', async function (wrapped, ...args) {
        const actor = args[0];
        if (actor.type === "character") {
            console.info("AlienRPG Panic Overhaul | checkAndEndPanic intercepted!", actor, args);
            await clearPanicItems(actor);   // Remove Panic items only for PCs
        }
        return wrapped(...args);    // Always run old method to handle broader reset
    }, 'MIXED');
    console.info("AlienRPG Custom Panic | checkAndEndPanic successfully overridden.");
});


// ===========================
// Utility function to parse attribute effects from text
// ===========================
const attribute_map = {
    STRENGTH: "str",   
    AGILITY: "agl",
    WITS: "wit",
    EMPATHY: "emp",
    STRESS: "stress",
    HEALTH: "health",
}
const skill_map = {
    "CLOSE COMBAT": "closeCbt",
    COMMAND: "command",
    COMTECH: "comtech",
    "HEAVY MACHINERY": "heavyMach",
    MANIPULATION: "manipulation",
    "MEDICAL AID": "medicalAid",
    MOBILITY: "mobility",
    OBSERVATION: "observation",
    PILOTING: "piloting",
    "RANGED COMBAT": "rangedCbt",
    STAMINA: "stamina",
    SURVIVAL: "survival"
};


// ===========================
// Utility function to exctact matching terms from text using regex
// ===========================
function parseEffectsFromText(text, statMap) {
    const effects = {};

    const keys = Object.keys(statMap);
    const regexPattern = keys
        .map(k => k.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join("|");

    const regex = new RegExp(`\\b(${regexPattern})([+-]\\d+)\\b`, "gi");

    let match;
    while ((match = regex.exec(text)) !== null) {
        const displayKey = match[1].toUpperCase();
        const internalKey = statMap[displayKey];
        if (!internalKey) continue; // just in case
        const val = parseInt(match[2], 10);
        effects[internalKey] = (effects[internalKey] || 0) + val;
    }
    return effects;
}


// ===========================
// Utility function to clear panic items on actor
// ===========================
async function clearPanicItems(actor) {
    const panicItems = actor.items.filter(i => i.name.startsWith("Panic Effect:"));
    if (panicItems.length === 0) return;
    await actor.deleteEmbeddedDocuments("Item", panicItems.map(i => i.id));
    console.info(`AlienRPG Custom Panic | Cleared ${panicItems.length} panic items.`);
}

// ===========================
// Settings Menu reset capability
// ===========================
class ResetSettingsForm extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
        id: "alienrpg-panic-reset-form",
        title: "Reset Custom Panic Settings",
        template: `modules/${moduleName}/templates/confirm-reset.html`,
        width: 400,
        closeOnSubmit: true
        });
    }

    getData() {
        return {};  // if you want to pass data to the template
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find("button[name='reset']").click(this._onReset.bind(this));
    }

    async _onReset(event) {
        event.preventDefault();
        
        // Reset each setting to default
        await game.settings.set(moduleName, "panicTableName", "Panic Table");
        await game.settings.set(moduleName, "panicRollFormula", "1d6 + @header.stress.value");
        await game.settings.set(moduleName, "statAutoApply", true);
        await game.settings.set(moduleName, "panicThreshold", 6);
        await game.settings.set(moduleName, "permanentTraumaThreshold", 12);
        await game.settings.set(moduleName, "catatonicThreshold", 15);
        await game.settings.set(moduleName, 'spacePanicTableName', 'Space Combat Panic Roll');
        await game.settings.set(moduleName, "spacePanicRollFormula", "1d6 + @header.stress.value");
        await game.settings.set(moduleName, "spacePanicThreshold", 6);

        ui.notifications.info("Alien RPG Custom Panic settings reset to defaults.");
        this.close();
        // Refresh the settings config UI so all inputs update (Spectrum + dropdowns)
        const settingsApp = Object.values(ui.windows).find(w => w instanceof SettingsConfig);
        if (settingsApp) settingsApp.render(true);
    }
}


// Helper to turn any string into Sentence case
function sentenceCase(str) {
    if (!str) return "";
    str = str.toLowerCase().trim();
    return str.charAt(0).toUpperCase() + str.slice(1);
}
