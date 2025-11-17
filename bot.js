/*
    Discord Bot specifically designed for the Sapphire Dream DnD 5e Campaign.
*/
const Discord = require('discord.js');
const { parse, roll, parseAndRoll, Roll } = require('roll-parser');
const { config } = require('dotenv');
config({
    path: __dirname + "/.env"
});
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { sheets } = require('googleapis/build/src/apis/sheets');
const client = new Discord.Client();
const goodparty = new GoogleSpreadsheet(process.env.GOODPARTY);
const evilparty = new GoogleSpreadsheet(process.env.EVILPARTY);

async function start() {
    await goodparty.useServiceAccountAuth(require('./credentials.json'));
    await evilparty.useServiceAccountAuth(require('./credentials.json'));
}
start().then(() => {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        client.user.setPresence({
            status: "online",
            game: {
                name: "in development",
                type: "WATCHING"
            }
        });
    });

    client.on('message', msg => {
        if (!msg.author.bot) {
            server_roles = msg.guild.roles.cache;
            member_roles = msg.member._roles;
            message = msg.content.toLowerCase();
            if (message.startsWith('k!')) {
                if (server_roles.get(member_roles[0]) == undefined) {
                    msg.reply(`You don't have permission to use this command.`);
                    return;
                }
                const hasGoodPartyRole = member_roles.some(role => server_roles.get(role).name === "Good Party");
                const hasEvilPartyRole = member_roles.some(role => server_roles.get(role).name === "Evil Party");
                if (hasGoodPartyRole && hasEvilPartyRole) {
                    msg.reply(`You can only view with either the Good Party role or Evil Party role, not both.`);
                    return;
                }
                if (hasGoodPartyRole) {
                    party = goodparty;
                } else if (hasEvilPartyRole) {
                    party = evilparty;
                } else {
                    msg.reply(`You don't have permission to use this command.`);
                    return;
                }
                if (message == 'k!help') {
                    msg.reply(`\n\`k!profile\`\n\`k!settlement {#}\`\n\`k!roll {Adv, Dis} {Economy, Loyality, Stability, Taxation}\``);
                } else if (message == 'k!profile') {
                    party.loadInfo().then(() => {
                        party.sheetsByIndex[0].loadCells().then(() => {
                            let text = getProfile(party.sheetsByIndex[0]);
                            msg.reply(text);
                        })
                    });
                } else if (message.startsWith('k!roll ')) {
                    let adv = null;
                    let spl = 7;
                    if (message.startsWith('k!roll adv')) {
                        adv = true
                        spl = 11
                    } else if (message.startsWith('k!roll dis')) {
                        adv = false
                        spl = 11
                    }
                    let check = message.slice(spl, message.length).toLowerCase();
                    party.loadInfo().then(() => {
                        party.sheetsByIndex[0].loadCells().then(() => {
                            check = check
                                .replace(new RegExp(party.sheetsByIndex[0].getCellByA1('C9').value.toLowerCase(), "gi"), '1d20+' + party.sheetsByIndex[0].getCellByA1('I9').value)
                                .replace(new RegExp(party.sheetsByIndex[0].getCellByA1('C11').value.toLowerCase(), "gi"), '1d20+' + party.sheetsByIndex[0].getCellByA1('I11').value)
                                .replace(new RegExp(party.sheetsByIndex[0].getCellByA1('C13').value.toLowerCase(), "gi"), '1d20+' + party.sheetsByIndex[0].getCellByA1('I13').value)
                                .replace(new RegExp(party.sheetsByIndex[0].getCellByA1('Y20').value.toLowerCase(), "gi"), '1d20+' + party.sheetsByIndex[0].getCellByA1('I9').value + '/' + party.sheetsByIndex[0].getCellByA1('AM26').value)
                            let output = ``;
                            if (adv != null) {
                                const tmp = (rollDie(check) + `\n` + rollDie(check)).replace(/\n*\n/, '\n').split(/\n/g);
                                const compare = [parseInt(tmp[0].split(': ')[1]), parseInt(tmp[2].split(': ')[1])];
                                if (adv && compare[0] > compare[1]) {
                                    output = tmp[0] + `\n>>> ` + tmp[1] + `\n~~` + tmp[3] + `~~`;
                                } else if (!adv && compare[0] <= compare[1]) {
                                    output = tmp[0] + `\n>>> ` + tmp[1] + `\n~~` + tmp[3] + `~~`;
                                } else {
                                    output = tmp[2] + `\n>>> ~~` + tmp[1] + `~~\n` + tmp[3];
                                }
                            } else {
                                const tmp = (rollDie(check) + `\n` + rollDie(check)).split(/\n/g);
                                output = tmp[0] + `\n>>> ` + tmp[1];
                            }
                            msg.reply(output);
                        })
                    });
                } else if (message.startsWith('k!settlement')) {
                    if (message.length == 12) {
                        let text = (`\`\`\`\rSettlements\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);
                        party.loadInfo().then(() => {
                            let setLength = party.sheetsByIndex.length;
                            console.log("Length: " + setLength);
                            settlementCount = setLength - 4;
                            sheet = [];
                            let i = 1;
                            function processNextSettlement() {
                                if (i > settlementCount) {
                                    text += `\`\`\``;
                                    msg.reply(text);
                                    return;
                                }
                                console.log(i);
                                party.sheetsByIndex[i].loadCells().then(() => {
                                    text += `\n` + `[` + i + `] ` + party.sheetsByIndex[i].getCellByA1('H2').value + ` - ` + party.sheetsByIndex[i].getCellByA1('AQ2').value;
                                    i++;
                                    processNextSettlement();
                                });
                            }
                            processNextSettlement();
                        });
                    } else {
                        party.loadInfo().then(() => {
                            try {
                                let i = parseInt(message.slice(13, message.length).replace(/\s/g, ''));
                                if (i <= 0 || i > party.sheetsByIndex.length - 2) throw 'OutofRange';
                                party.sheetsByIndex[i].loadCells().then(() => {
                                    let text = getSettlement(party.sheetsByIndex, i);
                                    msg.reply(text);
                                })
                            } catch (err) {
                                msg.reply(`Invalid settlement number. Type k!settlement for a list of settlements.`);
                            }
                        });
                    }
                } else {
                    msg.reply(`Invalid command. Type k!help for a list of commands.`);
                }
            }
        }
    });

    client.login(process.env.TOKEN);

    function getProfile(data) {
        const profileData = [
            { label: "Kingdom Name", cell: "I2" },
            { label: "Kingdom Size", cell: "I4" },
            { label: "Government", cell: "X2" },
            { label: "Alignment", cell: "AL2" },
            { label: "Population", cell: "AV2" },
            { label: "Treasury", cell: "AE26" },
            { label: "Fame", cell: "AC30" },
            { label: "Infamy", cell: "AC32" },
            { label: "Control DC", cell: "I7" },
            { label: "Economy", cell: "I9" },
            { label: "Loyalty", cell: "I11" },
            { label: "Stability", cell: "I13" },
            { label: "Unrest", cell: "AV26" },
            { label: "Consumption", cell: "AF24" },
            { label: "Ruler", cell: "G18" },
            { label: "Consort", cell: "G19" },
            { label: "Counciler", cell: "G20" },
            { label: "General", cell: "G21" },
            { label: "Grand Diplomat", cell: "G22" },
            { label: "Heir", cell: "G23" },
            { label: "High Priest", cell: "G24" },
            { label: "Magister", cell: "G25" },
            { label: "Marshall", cell: "G26" },
            { label: "Royal Enforcer", cell: "G27" },
            { label: "Spymaster", cell: "G28" },
            { label: "Treasurer", cell: "G29" },
            { label: "Viceroy", cell: "G30" },
            { label: "Warden", cell: "G31" },
            { label: "Holidays", cell: "AD18" },
            { label: "Expansion", cell: "AD19" },
            { label: "Taxation", cell: "AD20" },
            { label: "Recruitment", cell: "AD21" },
        ];

        const separatorLabels = ["Infamy", "Consumption", "Warden", "Recruitment"];
        let text = "```\n";
        profileData.forEach(item => {
            text += `${item.label}: ${data.getCellByA1(item.cell).value}\n`;
            if (separatorLabels.includes(item.label)) text += `\`\`\`\`\`\``;
        });

        for (let j = 0; j < 11; j++) {
            if (data.getCellByA1(('G' + (36 + j))).value != null)
                text += `\n${data.getCellByA1(('C' + (36 + j))).value}: ${data.getCellByA1(('G' + (36 + j))).value}`;
        }
        text += `\n\`\`\`\`\`\``;
        for (let j = 0; j < 8; j++) {
            if (data.getCellByA1(('X' + (36 + j))).value != null)
                text += `\n${data.getCellByA1(('T' + (36 + j))).value}: ${data.getCellByA1(('X' + (36 + j))).value}`;
        }
        text = (text + `\`\`\``).replace(/null/gi, `---`);
        return text;
    }

    function getSettlement(data, i) {
        const settlementData = [
            { label: "Settlement Name", cell: "H2" },
            { label: "Base Value", cell: "S2" },
            { label: "Defense", cell: "Z2" },
            { label: "Population", cell: "AH2" },
            { label: "Size (in lots)", cell: "AQ2" },
            { label: "Corruption", cell: "G4" },
            { label: "Crime", cell: "M4" },
            { label: "Productivity", cell: "S4" },
            { label: "Law", cell: "Y4" },
            { label: "Lore", cell: "AE4" },
            { label: "Society", cell: "AK4" },
            { label: "Danger", cell: "AQ4" },
        ];

        const separatorLabels = ["Size (in lots)", "Danger"];
        let text = "```\n";
        settlementData.forEach(item => {
            text += `${item.label}: ${data[i].getCellByA1(item.cell).value}\n`;
            if (separatorLabels.includes(item.label)) text += `\`\`\`\`\`\``;
        });

        for (let j = 0; j < 17; j++) {
            if (data[i].getCellByA1(('C' + (35 + j))).value != null)
                text += `\n${data[i].getCellByA1(('C' + (35 + j))).value}: ${data[i].getCellByA1(('H' + (35 + j))).value}`;
        }
        for (let j = 0; j < 17; j++) {
            if (data[i].getCellByA1(('Z' + (35 + j))).value != null)
                text += `\n${data[i].getCellByA1(('Z' + (35 + j))).value}: ${data[i].getCellByA1(('AE' + (35 + j))).value}`;
        }
        text = (text + `\`\`\``).replace(/null/gi, `---`);
        return text;
    }

    function rollDie(check) {
        let rolls = check.split(/\+|\-|\*|\//gi);
        let ops = check.replace(/[a-zA-Z0-9_.]*/gi, '').split('');
        let result = 0;
        let resultarray = [];
        for (let i = 0; i < rolls.length; i++) {
            let roll = parseAndRoll(rolls[i]);
            let toggle = rolls[i].includes('d');
            if (i == 0 || ops[i - 1] == "+") {
                if (!toggle)
                    result += Math.floor(parseInt(rolls[i]));
                else
                    result += Math.floor(parseInt(roll.value));
            } else if (ops[i - 1] == "-") {
                if (!toggle)
                    result -= Math.floor(parseInt(rolls[i]));
                else
                    result -= Math.floor(parseInt(roll.value));
            } else if (ops[i - 1] == "*") {
                if (!toggle)
                    result = Math.floor(result * parseInt(rolls[i]));
                else
                    result = Math.floor(result * parseInt(roll.value));
            } else if (ops[i - 1] == "/") {
                if (!toggle)
                    result = Math.floor(result / parseInt(rolls[i]));
                else
                    result = Math.floor(result / parseInt(roll.value));
            }
            toggle ? resultarray.push(roll.rolls.toString()) : resultarray.push(rolls[i]);
            roll = null;
        }
        return check + ": **" + result + `**\n[` + resultarray.toString().replace(/,/g, "][") + `]`;
    }
})