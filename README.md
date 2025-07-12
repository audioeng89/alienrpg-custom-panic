# 📖 AlienRPG Custom Panic for Foundry VTT 

<p>If you want to run homebrew panic rules in the superb <a href='https://github.com/pwatson100/alienrpg' target="_blank" rel="noopener noreferrer">AlienRPG system for Foundry VTT</a>, then this Custom Panic module has everything you'll need.  
AlienRPG Custom Panic overrides the hard-coded default values, allowing GMs to specify custom panic tables, dice rolls, and even elaborate nested tables.  
Custom Panic applies to regular Panic and Space Combat Panic rolls, complete with automated stats adjustments using simple text specifiers.</p>

<a href='https://ko-fi.com/T6T11HTIG3' target='_blank'>
  <img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' />
</a>

---

## 🚀 Installation

1. In Foundry, go to **Add-on Modules** and press the `Install Module` button.  
2. Paste this [link to the module.json](https://github.com/audioeng89/alienrpg-custom-panic/releases/latest/download/module.json) into the field at the bottom, then hit Install.  
3. The module uses [Lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper/) to safely protect against module conflicts, so install this if prompted.  
4. Enter your game world, and use the `Manage Modules` menu to enable **AlienRPG Custom Panic**.  
5. Configure your Panic Roll Tables as you like, or pick the preset from the **Custom Panic** Compendium.

---

## ⚙️ Custom Panic Configuration

Custom Panic defaults to the built-in AlienRPG Panic Table and Space Combat Panic Roll tables (which are not included!), or you can specify different tables to use.  
The module includes a heavily nested roll table example in the supplied compendium, [based on this excellent idea](https://forum.frialigan.se/viewtopic.php?t=13311) by Teean.

Configuration settings are found in the **Settings Menu** under **AlienRPG Custom Panic**.  
The module allows you to specify:

- Custom roll table names for both Panic and Space Combat Panic rolls
- Custom dice rolls for each
- The roll threshold at which the Panic status effect is applied
- For regular panic: separate thresholds for Permanent Trauma and Catatonic effects, displaying appropriate text in chat and setting the player to **unconscious**.

<img width="600" height="750" alt="Screenshot 2025-07-12 225003" src="https://github.com/user-attachments/assets/d486d475-8afa-44aa-b98d-8a1fe473e842" />

Between all these options, you can configure your roll tables however you like for entirely homebrew Panic Rolls, while still benefiting from the automation of the AlienRPG character sheets.

---

## 🔄 Automated Stat Adjustments

As an optional feature, **AlienRPG Custom Panic** supports integrated stat modifiers by automatically parsing stat keys from your roll table results and applying them to the character.

It works by assigning a **“panic item”** when a roll table result is triggered. This item is named using the stats applied or by the text at the start of your roll table result, if it begins with:

    <b>CONDITION NAME</b>

Panic items are automatically removed when the character’s panic ends, resetting their stats to normal (with the exception of **HEALTH** / damage and **STRESS**).

---

### 📌 How to encode stat modifiers

You can place the stat change anywhere in your roll table's result text for a natural, readable entry.

Use the format:

- `STAT+NUM` to increase a stat
- `STAT-NUM` to decrease a stat

✅ **Always use ALL-CAPS** for the stat name, immediately followed by the `+` or `-` number, with no spaces.

---

### 📝 Available Stat Modifiers

**Attributes:** `HEALTH`, `STRESS`, `STRENGTH`, `AGILITY`, `WITS`, `EMPATHY`  
**Skills:** `CLOSE COMBAT`, `COMMAND`, `COMTECH`, `HEAVY MACHINERY`, `MANIPULATION`, `MEDICAL AID`, `MOBILITY`, `OBSERVATION`, `PILOTING`, `RANGED COMBAT`, `STAMINA`, `SURVIVAL`

| Syntax      | Meaning             |
|-------------|----------------------|
| `STAT+NUM`  | Increase stat by NUM |
| `STAT-NUM`  | Decrease stat by NUM |

---

### 💡 Example

    <b>Jump scare:</b> You suffer STRESS+2 and all skill checks are rolled with EMPATHY-2 but you have CLOSE COMBAT+1 until your panic ends.

This makes it easy to write descriptive effects that also encode the data needed to automatically apply and remove stat changes.

<img width="845" height="569" alt="image" src="https://github.com/user-attachments/assets/79d25619-f8df-479b-b68d-303b7c6a3a78" />

