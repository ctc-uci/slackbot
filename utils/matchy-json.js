const Bot = require("./bot");
const fs = require("fs");
const path = require("path");
const { loadMembersData, saveMembersData } = require("./firebase");

// Create welcome message for matchy groups - Easy to edit!
const createWelcomeMessage = () => {
  const activities = [
    "☕ Grab a sweet treat (Omomomo, Mori's, Heytea, etc.)",
    "🍕 Grab food together (In-N-Out, Wadaya, Cava, Yintang, Burnt Crumbs, etc.)",
    "🏓 Play sports at the ARC (Pickleball, Badminton, Volleyball, etc.)",
    "🎮 Play League/Valorant together",
    "🛍️ Go shopping (Irvine Spectrum, Thrifting/Bins, etc.)",
    "🗺️ Explore a new place (Hiking Trail, Beach, etc.)",
    "💬 Just chat and get to know each other!"
  ];

  return `🎯 *Welcome to your Matchy Meetup!*

This is your weekly match group! Feel free to introduce yourselves and plan your meetup. Have fun! 🎉

*💡 Activity Ideas:*
${activities.map(activity => `• ${activity}`).join('\n')}

*Remember:* The goal is to connect and build relationships. Keep it casual and fun! 🤓👍`;
};

// loadMembersData and saveMembersData are now imported from firebase.js

// Get all members who have matchyEnabled: true
const getMembersFromJSON = async () => {
  const data = await loadMembersData();
  return (data.members || [])
    .filter((member) => member.matchyEnabled)
    .map((member) => member.slackId);
};

// Get previous matches from Firestore
const getPreviousMatches = async () => {
  const data = await loadMembersData();
  return data.previousMatches || {};
};

// Update previous matches in Firestore
const updatePreviousMatches = async (currentMatches, previousMatches) => {
  const data = await loadMembersData();
  
  // Update previous matches with current matches
  for (const match of currentMatches) {
    for (let i = 0; i < match.length; i++) {
      for (let j = i + 1; j < match.length; j++) {
        const user1 = match[i];
        const user2 = match[j];
        
        if (!previousMatches[user1]) previousMatches[user1] = [];
        if (!previousMatches[user2]) previousMatches[user2] = [];
        
        if (!previousMatches[user1].includes(user2)) {
          previousMatches[user1].push(user2);
        }
        if (!previousMatches[user2].includes(user1)) {
          previousMatches[user2].push(user1);
        }
      }
    }
  }
  
  // Save updated data
  data.previousMatches = previousMatches;
  await saveMembersData(data);
};

// Check if two members can be paired (haven't met before)
const validPairing = (member1, member2, previousMatches) => {
  const member1Previous = previousMatches[member1] || [];
  const member2Previous = previousMatches[member2] || [];
  
  return !member1Previous.includes(member2) && !member2Previous.includes(member1);
};

// Check if all possible unique combinations have been exhausted
const allCombinationsExhausted = (members, previousMatches) => {
  const totalMembers = members.length;
  const maxPossiblePairs = (totalMembers * (totalMembers - 1)) / 2;
  
  // Count total unique pairs that have met
  const allMetPairs = new Set();
  for (const member of members) {
    const previous = previousMatches[member] || [];
    for (const metMember of previous) {
      if (members.includes(metMember)) {
        // Create a consistent pair key (smaller ID first)
        const pairKey = member < metMember ? `${member}-${metMember}` : `${metMember}-${member}`;
        allMetPairs.add(pairKey);
      }
    }
  }
  
  // If we've met at least 80% of possible pairs, allow repeats
  return allMetPairs.size >= (maxPossiblePairs * 0.8);
};

// Generate matches using a random group algorithm (groups of 2 or 3, no groups of 1)
const getMatches = (members, previousMatches) => {
  const matches = [];
  const used = new Set();
  
  // Check if we should allow repeats
  const allowRepeats = allCombinationsExhausted(members, previousMatches);
  
  // Create a copy of members array and shuffle it randomly
  const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
  
  let i = 0;
  while (i < shuffledMembers.length) {
    if (used.has(shuffledMembers[i])) {
      i++;
      continue;
    }
    
    const currentMatch = [shuffledMembers[i]];
    used.add(shuffledMembers[i]);
    
    // Calculate remaining members after this group
    const remainingAfterThisGroup = shuffledMembers.length - used.size;
    
    // Decide group size based on remaining members
    let groupSize;
    if (remainingAfterThisGroup === 0) {
      // Last person - try to make group of 2 or 3
      groupSize = Math.random() < 0.5 ? 2 : 3;
    } else if (remainingAfterThisGroup === 1) {
      // One person left after this group - make this group of 3 so we can split it
      groupSize = 3;
    } else {
      // Multiple people left - randomly choose 2 or 3
      groupSize = Math.random() < 0.6 && remainingAfterThisGroup >= 2 ? 3 : 2;
    }
    
    // Try to find additional members for the group
    let attempts = 0;
    while (currentMatch.length < groupSize && attempts < 50) {
      const randomIndex = Math.floor(Math.random() * shuffledMembers.length);
      const candidate = shuffledMembers[randomIndex];
      
      if (!used.has(candidate)) {
        // Check if this candidate can be paired with all current group members
        const canJoin = allowRepeats || currentMatch.every(member => 
          validPairing(member, candidate, previousMatches)
        );
        
        if (canJoin) {
          currentMatch.push(candidate);
          used.add(candidate);
        }
      }
      attempts++;
    }
    
    matches.push(currentMatch);
    i++;
  }
  
  // Post-process to ensure no groups of 1
  return ensureNoSingleGroups(matches, previousMatches, allowRepeats);
};

// Helper function to ensure no groups of 1 by splitting larger groups
const ensureNoSingleGroups = (matches, previousMatches, allowRepeats = false) => {
  const result = [];
  const singles = [];
  
  // Separate groups of 1 from other groups
  matches.forEach(match => {
    if (match.length === 1) {
      singles.push(match[0]);
    } else {
      result.push(match);
    }
  });
  
  // If we have singles, try to merge them with existing groups
  while (singles.length > 0) {
    const single = singles.shift();
    let merged = false;
    
    // Try to add to existing groups of 2
    for (let i = 0; i < result.length; i++) {
      if (result[i].length === 2) {
        const canJoin = allowRepeats || result[i].every(member => 
          validPairing(member, single, previousMatches)
        );
        
        if (canJoin) {
          result[i].push(single);
          merged = true;
          break;
        }
      }
    }
    
    // If couldn't merge, try to create a new group with another single
    if (!merged && singles.length > 0) {
      const anotherSingle = singles.shift();
      const canPair = allowRepeats || validPairing(single, anotherSingle, previousMatches);
      
      if (canPair) {
        result.push([single, anotherSingle]);
        merged = true;
      } else {
        // If they can't be paired, put them back and try to split a group of 3
        singles.unshift(anotherSingle);
        
        // Find a group of 3 and split it
        for (let i = 0; i < result.length; i++) {
          if (result[i].length === 3) {
            const groupOf3 = result[i];
            // Try different combinations to split the group
            for (let j = 0; j < groupOf3.length; j++) {
              const member1 = groupOf3[j];
              const member2 = groupOf3[(j + 1) % 3];
              const member3 = groupOf3[(j + 2) % 3];
              
              const canJoin1 = allowRepeats || validPairing(single, member1, previousMatches);
              const canJoin2 = allowRepeats || validPairing(anotherSingle, member2, previousMatches);
              
              if (canJoin1 && canJoin2) {
                result[i] = [member1, single];
                result.push([member2, anotherSingle]);
                result.push([member3]);
                singles.unshift(member3);
                merged = true;
                break;
              }
            }
            if (merged) break;
          }
        }
      }
    }
    
    // If still couldn't merge, force merge with any available group (when allowRepeats is true)
    if (!merged && allowRepeats) {
      // Find any group with space and force add the single
      for (let i = 0; i < result.length; i++) {
        if (result[i].length < 3) {
          result[i].push(single);
          merged = true;
          break;
        }
      }
    }
    
    // If still couldn't merge, force create a group by splitting the largest group
    if (!merged) {
      // Find the largest group and split it to accommodate the single
      let largestGroupIndex = -1;
      let largestGroupSize = 0;
      
      for (let i = 0; i < result.length; i++) {
        if (result[i].length > largestGroupSize) {
          largestGroupSize = result[i].length;
          largestGroupIndex = i;
        }
      }
      
      if (largestGroupIndex !== -1 && largestGroupSize >= 2) {
        const groupToSplit = result[largestGroupIndex];
        const member1 = groupToSplit[0];
        const member2 = groupToSplit[1];
        
        // Create two groups: [member1, single] and [member2]
        result[largestGroupIndex] = [member1, single];
        if (groupToSplit.length > 2) {
          result.push([member2, ...groupToSplit.slice(2)]);
        } else {
          result.push([member2]);
        }
        merged = true;
      }
    }
    
    // Last resort: force merge with any group, even if it makes it larger than 3
    if (!merged) {
      // Find any group and add the single to it
      if (result.length > 0) {
        result[0].push(single);
        merged = true;
      } else {
        // This should never happen, but if it does, create a group with just this single
        // and we'll handle it in the next iteration
        result.push([single]);
      }
    }
  }
  
  // Final cleanup: ensure no groups of 1 remain
  const finalResult = [];
  const remainingSingles = [];
  
  result.forEach(match => {
    if (match.length === 1) {
      remainingSingles.push(match[0]);
    } else {
      finalResult.push(match);
    }
  });
  
  // Force merge any remaining singles
  while (remainingSingles.length > 0) {
    const single = remainingSingles.shift();
    
    // Try to add to existing groups of 2
    let merged = false;
    for (let i = 0; i < finalResult.length; i++) {
      if (finalResult[i].length === 2) {
        finalResult[i].push(single);
        merged = true;
        break;
      }
    }
    
    // If no groups of 2, add to any group
    if (!merged && finalResult.length > 0) {
      finalResult[0].push(single);
    } else if (!merged) {
      // Last resort: create a group with another single if available
      if (remainingSingles.length > 0) {
        const anotherSingle = remainingSingles.shift();
        finalResult.push([single, anotherSingle]);
      } else {
        // This should never happen now
        finalResult.push([single]);
      }
    }
  }
  
  return finalResult;
};

// Format matches for display
const formatMatches = (matches, membersData, allowRepeats = false) => {
  let output = "🎯 **This Week's Matchy Meetups:**\n\n";
  
  if (allowRepeats) {
    output += "🔄 *Note: Allowing repeat matches as most unique combinations have been exhausted*\n\n";
  }
  
  if (matches.length === 0) {
    return output + "No matches found! Everyone might have already met each other.";
  }
  
  matches.forEach((match, index) => {
    const memberNames = match.map(slackId => {
      const member = membersData.members.find(m => m.slackId === slackId);
      return member ? `@${member.name}` : `@${slackId}`;
    });
    
    // Format based on group size
    let groupText;
    if (memberNames.length === 2) {
      groupText = `${memberNames[0]} & ${memberNames[1]}`;
    } else if (memberNames.length === 3) {
      groupText = `${memberNames[0]}, ${memberNames[1]} & ${memberNames[2]}`;
    } else {
      groupText = memberNames.join(", ");
    }
    
    output += `${index + 1}. ${groupText}\n`;
  });
  
  return output;
};

// Main function to add user who ran /matchy to JSON
const addUserToMatchy = async ({ ack, respond, command }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] /matchy executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    // Get the user who ran the command
    
    if (!userId) {
      await respond("❌ Could not identify user. Please try again.");
      return;
    }
    
    // Load members data
    const membersData = await loadMembersData();
    
    // Check if user already exists
    const existingMember = membersData.members.find(member => member.slackId === userId);
    
    if (existingMember) {
      if (existingMember.matchyEnabled) {
        existingMember.matchyEnabled = false;
        await saveMembersData(membersData);
        await respond(`✅ You've been removed from the Matchy system!`);
        return;
      } else {
        existingMember.matchyEnabled = true;
        await saveMembersData(membersData);
        await respond(`✅ You've been added to the Matchy system!`);
        return;
      }
    }
    
    // Get user info from Slack
    try {
      const userResult = await Bot.client.users.info({ user: userId });
      
      if (!userResult.ok || !userResult.user) {
        await respond("❌ Error fetching your user info. Please try again.");
        return;
      }
      
      const user = userResult.user;
      
      // Skip bots and deleted users
      if (user.is_bot || user.deleted) {
        await respond("❌ Bots cannot be added to Matchy.");
        return;
      }
      
      // Create new member object
      const newMember = {
        slackId: user.id,
        name: user.real_name || user.display_name || user.name || "Unknown",
        role: "MEMBER",
        repos: [],
        github: "",
        rep: 0,
        matchyEnabled: true
      };
      
      // Add to members array
      membersData.members.push(newMember);
      
      // Save to Firestore
      await saveMembersData(membersData);
      
      console.log(`✅ Added new member to JSON: ${newMember.name} (@${userId})`);
      await respond(`✅ You've been added to the Matchy system!\n\nYour profile:\n• Name: ${newMember.name}\n• Matchy Enabled: Yes\n\nYou'll now be included in weekly matchy meetups! 🎉`);
      
    } catch (error) {
      console.error(`Error fetching user info for ${userId}:`, error);
      await respond("❌ Error adding you to Matchy. Check the logs for details.");
    }
    
  } catch (error) {
    console.error("Error in generateMatchyMeetups:", error);
    await respond("❌ Error processing /matchy command. Check the logs for details.");
  }
};

// Function to remove user who ran the command from JSON
const removeUserFromMatchy = async ({ ack, respond, command }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] removeUserFromMatchy executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    // Get the user who ran the command
    
    if (!userId) {
      await respond("❌ Could not identify user. Please try again.");
      return;
    }
    
    // Load members data
    const membersData = await loadMembersData();
    
    // Find the user in the members array
    const member = membersData.members.find(member => member.slackId === userId);
    
    if (!member) {
      await respond("❌ You're not in the Matchy system!");
      return;
    }
    
    // Disable match participation but keep their history
    member.matchyEnabled = false;
    
    await saveMembersData(membersData);
    
    console.log(`✅ Disabled member participation: ${member.name} (@${userId})`);
    await respond(`✅ You've been removed from the Matchy rotation, ${member.name}. Your previous matches are still saved if you decide to return!`);
    
  } catch (error) {
    console.error("Error in removeUserFromMatchy:", error);
    await respond("❌ Error removing you from Matchy. Check the logs for details.");
  }
};

// Function to actually generate and create matches (used by scheduled jobs)
const generateMatches = async ({ respond }) => {
  try {
    console.log("Generating Matchy meetups...");
    
    const membersData = await loadMembersData();
    
    // Check if matchy is paused (persistent toggle)
    if (membersData.matchyPaused) {
      const message = "⏸️ Matchy generation is currently paused.";
      if (respond) {
        await respond(message);
      } else {
        console.log(message);
      }
      return;
    }
    
    // Check for one-time skip
    if (membersData.skipNextMatchy) {
      membersData.skipNextMatchy = false;
      await saveMembersData(membersData);
      const message = "⏸️ Matchy generation skipped this week.";
      if (respond) {
        await respond(message);
      } else {
        console.log(message);
      }
      return;
    }
    
    const members = await getMembersFromJSON();
    const previousMatches = await getPreviousMatches();
    const overrides = Array.isArray(membersData.nextMatchOverrides) ? membersData.nextMatchOverrides : [];
    const forcedMatches = [];
    const availableSet = new Set(members);
    
    overrides.forEach(group => {
      if (!Array.isArray(group)) return;
      const uniqueGroup = [...new Set(group)].filter(memberId => availableSet.has(memberId));
      if (uniqueGroup.length >= 2) {
        forcedMatches.push(uniqueGroup);
        uniqueGroup.forEach(memberId => availableSet.delete(memberId));
      }
    });
    
    const availableMembers = members.filter(memberId => availableSet.has(memberId));
    
    // console.log("Available members:", members);
    // console.log("Previous matches:", previousMatches);
    
    if (members.length < 2) {
      const message = "❌ Not enough members enabled for Matchy! Need at least 2 people.";
      if (respond) {
        await respond(message);
      } else {
        console.log(message);
      }
      return;
    }
    
    // Generate matches for remaining members
    const currentMatches = getMatches(availableMembers, previousMatches);
    const allMatches = [...forcedMatches, ...currentMatches];
    
    // Check if repeats were allowed for this round
    const allowRepeats = allCombinationsExhausted(members, previousMatches);
    
    // Automatically create group chats
    await createGroupChats(allMatches, membersData, respond, allowRepeats);
    
    // Clear overrides after successful generation
    const latestData = await loadMembersData();
    latestData.nextMatchOverrides = [];
    await saveMembersData(latestData);
    
    console.log("Generated and created matches:", allMatches);
    
  } catch (error) {
    console.error("Error in generateMatches:", error);
    if (respond) {
      await respond("❌ Error generating matches. Check the logs for details.");
    }
  }
};

// Automatically create group chats for matches
const createGroupChats = async (matches, membersData, respond, allowRepeats) => {
  try {
    const previousMatches = await getPreviousMatches();
    
    // Update previous matches
    await updatePreviousMatches(matches, previousMatches);
    
    // Create group chats for each match
    const createdGroups = [];
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      try {
        // Create group DM
        const groupResult = await Bot.client.conversations.open({
          users: match.join(',')
        });
        
        if (groupResult.ok) {
          const channelId = groupResult.channel.id;
          createdGroups.push({
            channelId: channelId,
            members: match,
            memberNames: match.map(slackId => {
              const member = membersData.members.find(m => m.slackId === slackId);
              return member ? member.name : slackId;
            })
          });
          
          // Send welcome message to the group
          const welcomeMessage = createWelcomeMessage();
          await Bot.client.chat.postMessage({
            channel: channelId,
            text: welcomeMessage
          });
        }
      } catch (error) {
        console.error(`Error creating group for match ${i + 1}:`, error);
      }
    }
    
    // Send summary to the channel
    let output = `🎯 *Matchy Meetups Created!*\n\n`;
    
    if (allowRepeats) {
      output += `🔄 *Note: Allowing repeat matches as most unique combinations have been exhausted*\n\n`;
    }
    
    createdGroups.forEach((group, index) => {
      const memberNames = group.memberNames.join(", ");
      output += `${index + 1}. *Group ${index + 1}:* ${memberNames}\n`;
    });
    
    output += `\n*Summary:*\n`;
    output += `• ${createdGroups.length} group chats created\n`;
    output += `• ${matches.reduce((sum, match) => sum + match.length, 0)} people matched\n`;
    output += `• Previous matches updated\n`;
    output += `• Welcome messages sent to each group\n`;
    
    await respond(output);
    
    console.log(`Successfully created ${createdGroups.length} group chats`);
    
  } catch (error) {
    console.error("Error creating group chats:", error);
    await respond("❌ Error creating group chats. Check the logs for details.");
  }
};


// Clear all previous matches (for testing)
const clearMatchy = async ({ ack, respond }) => {
  try {
    await ack();
    
    const data = await loadMembersData();
    data.previousMatches = {};
    await saveMembersData(data);
    
    await respond("🧹 Cleared all previous Matchy matches!");
    
  } catch (error) {
    console.error("Error clearing matches:", error);
    await respond("❌ Error clearing matches. Check the logs for details.");
  }
};

// Load and display member data
const loadMembersDataCommand = async ({ ack, respond, command }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] /profile executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    const data = await loadMembersData();
    const members = data.members || [];
    const previousMatches = data.previousMatches || {};
    
    let output = "📊 **Member Data Loaded:**\n\n";
    
    if (members.length === 0) {
      output += "⚠️ **No members found in data file!**\n";
      output += "The members.json file appears to be empty or corrupted.\n\n";
      output += "**Expected structure:**\n";
      output += "```json\n";
      output += "{\n";
      output += "  \"members\": [\n";
      output += "    {\n";
      output += "      \"slackId\": \"U1234567890\",\n";
      output += "      \"name\": \"John Doe\",\n";
      output += "      \"role\": \"MEMBER\",\n";
      output += "      \"matchyEnabled\": true\n";
      output += "    }\n";
      output += "  ],\n";
      output += "  \"previousMatches\": {}\n";
      output += "}\n";
      output += "```";
    } else {
      output += `**Total Members:** ${members.length}\n`;
      output += `**Matchy Enabled:** ${members.filter(m => m.matchyEnabled).length}\n`;
      output += `**Matchy Disabled:** ${members.filter(m => !m.matchyEnabled).length}\n\n`;
      
      // Show first few members as preview
      output += "**Preview:**\n";
      members.forEach((member, index) => {
        output += `${index + 1}. ${member.name || 'Unknown'} (${member.role || 'Unknown'}) - ${member.matchyEnabled ? '✅' : '❌'}\n`;
      });
      
      output += `\n**Previous Matches:** ${Object.keys(previousMatches).length} members have match history\n`;
    }
    
    await respond(output);
    
    console.log(`Loaded member data: ${members.length} total members`);
    
  } catch (error) {
    console.error("Error loading member data:", error);
    await respond("❌ Error loading member data. Check the logs for details.");
  }
};

// Export members JSON inline in the Slack message (no file upload)
const exportMembersJSON = async ({ ack, respond }) => {
  try {
    await ack();
    console.log("Exporting members JSON (inline)...");
    
    // Load members data
    const data = await loadMembersData();
    const jsonString = JSON.stringify(data, null, 2);
    
    // Slack message size is limited; truncate if too long
    const max = 2900; // leave room for fencing and extras
    const preview = jsonString.length > max ? `${jsonString.substring(0, max)}\n... (truncated)` : jsonString;
    
    await respond({
      text: "📦 Members JSON Export",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📦 *Members JSON Export*\n\nHere is the current contents of `members.json`:"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`json\n${preview}\n\`\`\``
          }
        }
      ]
    });
  } catch (error) {
    console.error("Error in exportMembersJSON:", error);
    await respond("❌ Error exporting members JSON. Check the logs for details.");
  }
};

// Add new members to JSON when they join the channel (no auto-approval)
const addNewMemberToJSON = async (userId) => {
  try {
    console.log(`New member joined: ${userId}`);
    
    // Get user info
    const userResult = await Bot.client.users.info({
      user: userId
    });
    
    if (!userResult.ok || !userResult.user) {
      console.error(`Error fetching user info for ${userId}:`, userResult.error);
      return;
    }
    
    const user = userResult.user;
    
    // Skip bots and deleted users
    if (user.is_bot || user.deleted) {
      console.log(`Skipping bot/deleted user: ${userId}`);
      return;
    }
    
    // Create new member object
    const newMember = {
      slackId: user.id,
      name: user.real_name || user.display_name || user.name || "Unknown",
      role: "MEMBER", // Default role
      repos: [], // Empty initially
      github: "", // Empty initially
      rep: 0, // Default rep
      matchyEnabled: true // Auto-enable for new members
    };
    
    // Load existing data
    const data = await loadMembersData();
    
    // Check if user already exists
    const existingMember = data.members.find(member => member.slackId === userId);
    if (existingMember) {
      console.log(`User ${userId} already exists in members list`);
      return;
    }
    
    // Add new member
    data.members.push(newMember);
    
    // Save updated data
    await saveMembersData(data);
    
    console.log(`✅ Added new member to JSON: ${newMember.name} (@${userId})`);
    
    // Send notification to channel
    // try {
    //   await Bot.client.chat.postMessage({
    //     channel: "C01FL4VCE1Z", // The matchy channel
    //     text: `🎉 **Welcome to Matchy!**\n\n**${newMember.name}** has joined the channel and been automatically added to the matchy system!\n\nThey're now eligible for weekly meetups. 👋`
    //   });
    // } catch (error) {
    //   console.error("Error sending welcome message:", error);
    // }
    
  } catch (error) {
    console.error("Error adding new member to JSON:", error);
  }
};


// Open modal to manage members (view channel users and add to Firestore)
const openManageMembersModal = async ({ ack, body, client }) => {
  try {
    await ack();
    
    const channelId = "C01FL4VCE1Z"; // The matchy channel ID
    
    // Get channel members
    const membersResult = await client.conversations.members({
      channel: channelId
    });
    
    if (!membersResult.ok) {
      throw new Error(`Error fetching channel members: ${membersResult.error}`);
    }
    
    const memberIds = membersResult.members;
    console.log(`Found ${memberIds.length} members in channel`);
    
    // Get user info for each member in parallel (much faster!)
    const userPromises = memberIds.map(async (userId) => {
      try {
        const userResult = await client.users.info({ user: userId });
        
        if (userResult.ok && userResult.user) {
          const user = userResult.user;
          
          // Skip bots and deleted users
          if (!user.is_bot && !user.deleted) {
            return {
              id: user.id,
              name: user.real_name || user.display_name || user.name || "Unknown",
              email: user.profile?.email || "",
              image: user.profile?.image_72 || ""
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
      return null;
    });
    
    // Wait for all user fetches to complete
    const userResults = await Promise.all(userPromises);
    const users = userResults.filter(user => user !== null);
    
    // Get existing members from Firestore
    const existingData = await loadMembersData();
    const existingMemberIds = new Set(existingData.members.map(m => m.slackId));
    
    // Sort users: not in system first, then alphabetically
    users.sort((a, b) => {
      const aExists = existingMemberIds.has(a.id);
      const bExists = existingMemberIds.has(b.id);
      if (aExists !== bExists) return aExists ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    
    // Create modal blocks
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "👥 Manage Matchy Members"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Found *${users.length}* users in the matchy channel. Select users to add to the Matchy system.\n\nUsers already in the system are marked with ✅`
        }
      },
      {
        type: "divider"
      }
    ];
    
    // Add user multi-select (limit to 50 for modal size)
    const usersToShow = users
    const userOptions = usersToShow.map(user => {
      const isInSystem = existingMemberIds.has(user.id);
      return {
        text: {
          type: "plain_text",
          text: `${user.name}${isInSystem ? " ✅" : ""}`
        },
        value: user.id,
        description: {
          type: "plain_text",
          text: isInSystem ? "Already in system" : "Click to add"
        }
      };
    });
    
    blocks.push({
      type: "section",
      block_id: "users_selection",
      text: {
        type: "mrkdwn",
        text: "*Select users to add to Matchy:*"
      },
      accessory: {
        type: "multi_static_select",
        placeholder: {
          type: "plain_text",
          text: "Select users..."
        },
        action_id: "selected_users",
        options: userOptions,
        max_selected_items: 50
      }
    });
    
    if (users.length > 50) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Showing first 50 of ${users.length} users. Use search to find specific users.`
          }
        ]
      });
    }
    
    // Open the modal
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: "modal",
          callback_id: "manage_members_modal",
          title: {
            type: "plain_text",
            text: "Manage Members"
          },
          submit: {
            type: "plain_text",
            text: "Add Selected Users"
          },
          close: {
            type: "plain_text",
            text: "Cancel"
          },
          blocks: blocks
        }
      });
    } catch (modalError) {
      // If trigger_id expired, send a message instead
      if (modalError.data?.error === 'expired_trigger_id') {
        console.log("Trigger ID expired, sending message response instead");
        await client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: `⏱️ Loading users took too long. Found *${users.length}* users in the channel.\n\nPlease try the command again - it should be faster on the second attempt as we cache the results.`
        });
      } else {
        throw modalError;
      }
    }
    
  } catch (error) {
    console.error("Error opening manage members modal:", error);
    // Try to send an error message if possible
    try {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: `❌ Error loading members: ${error.message}`
      });
    } catch (err) {
      // If we can't send a message, just log it
      console.error("Could not send error message:", err);
    }
  }
};

// Handle modal submission - add selected users to Firestore
const handleManageMembersSubmitted = async ({ ack, body, view, client }) => {
  try {
    await ack();
    
    const selectedUsers = [];
    const stateValues = view.state.values;

    
    // Extract selected users from multi-select
    if (stateValues.users_selection && stateValues.users_selection.selected_users) {
      const selectedOptions = stateValues.users_selection.selected_users.selected_options || [];
      selectedUsers.push(...selectedOptions.map(opt => opt.value));
    }
    
    if (selectedUsers.length === 0) {
      await client.views.update({
        view_id: body.view.id,
        view: {
          type: "modal",
          title: {
            type: "plain_text",
            text: "Manage Members"
          },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "❌ No users selected. Please select at least one user to add."
              }
            }
          ]
        }
      });
      return;
    }
    
    // Load existing data
    const existingData = await loadMembersData();
    const existingMemberIds = new Set(existingData.members.map(m => m.slackId));
    
    // Get user info and add to Firestore
    let addedCount = 0;
    let skippedCount = 0;
    const addedUsers = [];
    
    for (const userId of selectedUsers) {
      // Skip if already in system
      if (existingMemberIds.has(userId)) {
        skippedCount++;
        continue;
      }
      
      try {
        const userResult = await client.users.info({ user: userId });
        
        if (userResult.ok && userResult.user) {
          const user = userResult.user;
          
          if (!user.is_bot && !user.deleted) {
            const newMember = {
              slackId: user.id,
              name: user.real_name || user.display_name || user.name || "Unknown",
              role: "MEMBER",
              repos: [],
              github: "",
              rep: 0,
              matchyEnabled: true
            };
            
            existingData.members.push(newMember);
            addedUsers.push(newMember.name);
            addedCount++;
          }
        }
      } catch (error) {
        console.error(`Error adding user ${userId}:`, error);
      }
    }
    
    // Save updated data to Firestore
    if (addedCount > 0) {
      await saveMembersData(existingData);
    }
    
    // Show success message
    let message = `✅ Successfully added *${addedCount}* user(s) to Matchy!\n\n`;
    
    if (addedUsers.length > 0) {
      message += `*Added users:*\n${addedUsers.map((name, i) => `${i + 1}. ${name}`).join("\n")}\n\n`;
    }
    
    if (skippedCount > 0) {
      message += `*Skipped:* ${skippedCount} user(s) (already in system)`;
    }
    
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Manage Members"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message
            }
          }
        ]
      }
    });
    
  } catch (error) {
    console.error("Error handling manage members submission:", error);
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Manage Members"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `❌ Error adding users: ${error.message}`
            }
          }
        ]
      }
    });
  }
};

// Open modal to manage previous matches (add/remove match history)
const openManageMatchesModal = async ({ ack, body, client }) => {
  try {
    // Acknowledge immediately to prevent timeout
    await ack();
    
    // Load existing data
    const existingData = await loadMembersData();
    const members = existingData.members || [];
    const previousMatches = existingData.previousMatches || {};
    
    // Create member options for dropdowns
    const memberOptions = members.map(member => ({
      text: {
        type: "plain_text",
        text: member.name || member.slackId
      },
      value: member.slackId
    }));
    
    // Create blocks for the modal
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🤝 Manage Previous Matches"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Manage match history between members. This helps the system avoid pairing people who have already met.`
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Add New Match Groups:*\nSelect 2-3 members per group who have already met. You can add up to 3 groups at once."
        }
      },
      {
        type: "section",
        block_id: "group1_selection",
        text: {
          type: "mrkdwn",
          text: "*Group 1:* (Select 2-3 members)"
        },
        accessory: {
          type: "multi_static_select",
          placeholder: {
            type: "plain_text",
            text: "Select members for group 1..."
          },
          action_id: "group1",
          options: memberOptions,
          max_selected_items: 3
        }
      },
      {
        type: "section",
        block_id: "group2_selection",
        text: {
          type: "mrkdwn",
          text: "*Group 2:* (Optional - Select 2-3 members)"
        },
        accessory: {
          type: "multi_static_select",
          placeholder: {
            type: "plain_text",
            text: "Select members for group 2..."
          },
          action_id: "group2",
          options: memberOptions,
          max_selected_items: 3
        }
      },
      {
        type: "section",
        block_id: "group3_selection",
        text: {
          type: "mrkdwn",
          text: "*Group 3:* (Optional - Select 2-3 members)"
        },
        accessory: {
          type: "multi_static_select",
          placeholder: {
            type: "plain_text",
            text: "Select members for group 3..."
          },
          action_id: "group3",
          options: memberOptions,
          max_selected_items: 3
        }
      },
      {
        type: "divider"
      }
    ];
    
    // Calculate match statistics
    const matchCount = Object.keys(previousMatches).reduce((sum, key) => {
      return sum + (previousMatches[key]?.length || 0);
    }, 0) / 2; // Divide by 2 since each match is stored twice
    
    const membersWithMatches = Object.keys(previousMatches).filter(
      memberId => previousMatches[memberId] && previousMatches[memberId].length > 0
    );
    
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Match History Summary:*\n• ${Math.floor(matchCount)} unique pairs\n• ${membersWithMatches.length} members with match history`
      }
    });
    
    blocks.push({
      type: "divider"
    });
    
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Previous Matches by Member:*"
      }
    });
    
    // Display matches organized by member (limit to first 15 members for modal size)
    const displayedMembers = [];
    const membersToShow = membersWithMatches;
    
    membersToShow.forEach(memberId => {
      const member = members.find(m => m.slackId === memberId);
      const memberName = member?.name || memberId;
      const matchedIds = previousMatches[memberId] || [];
      
      if (matchedIds.length > 0) {
        // Get names of matched members
        const matchedNames = matchedIds.map(matchedId => {
          const matchedMember = members.find(m => m.slackId === matchedId);
          return matchedMember?.name || matchedId;
        });
        
        // Create a display string
        const matchesText = matchedNames.join(", ");
        
        // Create a key for removing all matches for this member
        const sortedIds = [memberId, ...matchedIds].sort();
        const groupKey = sortedIds.join('-');
        
        displayedMembers.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${memberName}*\nMatched with: ${matchesText}`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Remove All"
            },
            style: "danger",
            action_id: `remove_match_${groupKey}`,
            value: groupKey
          }
        });
      }
    });
    
    blocks.push(...displayedMembers);
    
    if (displayedMembers.length === 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_No previous matches recorded yet._"
        }
      });
    }
    
    if (membersWithMatches.length > 15) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Showing ${membersWithMatches.length} members with matches. Use the export command to see all matches.`
          }
        ]
      });
    }
    
    // Open the modal
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: "modal",
          callback_id: "manage_matches_modal",
          title: {
            type: "plain_text",
            text: "Manage Matches"
          },
          submit: {
            type: "plain_text",
            text: "Add Groups"
          },
          close: {
            type: "plain_text",
            text: "Cancel"
          },
          blocks: blocks
        }
      });
    } catch (modalError) {
      if (modalError.data?.error === 'expired_trigger_id') {
        console.log("Trigger ID expired, sending message response instead");
        await client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: `⏱️ Loading matches took too long. Please try the command again.`
        });
      } else {
        throw modalError;
      }
    }
    
  } catch (error) {
    console.error("Error opening manage matches modal:", error);
    try {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: `❌ Error loading matches: ${error.message}`
      });
    } catch (err) {
      console.error("Could not send error message:", err);
    }
  }
};

// Handle modal submission - add match groups to Firestore
const handleManageMatchesSubmitted = async ({ ack, body, view, client }) => {
  try {
    await ack();
    
    const stateValues = view.state.values;
    
    // Extract groups from multi-select fields
    const groups = [];
    for (let i = 1; i <= 3; i++) {
      const groupSelection = stateValues[`group${i}_selection`]?.[`group${i}`];
      if (groupSelection && groupSelection.selected_options && groupSelection.selected_options.length >= 2) {
        const memberIds = groupSelection.selected_options.map(opt => opt.value);
        // Validate group size (2-3 members)
        if (memberIds.length >= 2 && memberIds.length <= 3) {
          // Check for duplicates within group
          const uniqueIds = [...new Set(memberIds)];
          if (uniqueIds.length === memberIds.length) {
            groups.push(memberIds);
          }
        }
      }
    }
    
    if (groups.length === 0) {
      await client.views.update({
        view_id: body.view.id,
        view: {
          type: "modal",
          title: {
            type: "plain_text",
            text: "Manage Matches"
          },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "❌ Please select at least one group with 2-3 members. Each group must have unique members."
              }
            }
          ]
        }
      });
      return;
    }
    
    // Load existing data
    const existingData = await loadMembersData();
    const previousMatches = existingData.previousMatches || {};
    const members = existingData.members || [];
    
    // Process each group
    const addedGroups = [];
    const skippedGroups = [];
    let totalPairsAdded = 0;
    
    for (const group of groups) {
      // Check if all pairs in this group already exist
      let groupAlreadyExists = true;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const member1Id = group[i];
          const member2Id = group[j];
          
          if (!previousMatches[member1Id] || !previousMatches[member1Id].includes(member2Id)) {
            groupAlreadyExists = false;
            break;
          }
        }
        if (!groupAlreadyExists) break;
      }
      
      if (groupAlreadyExists) {
        const groupNames = group.map(id => {
          const member = members.find(m => m.slackId === id);
          return member?.name || id;
        });
        skippedGroups.push(groupNames.join(", "));
        continue;
      }
      
      // Add all pairs in the group (bidirectional)
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const member1Id = group[i];
          const member2Id = group[j];
          
          // Initialize arrays if they don't exist
          if (!previousMatches[member1Id]) {
            previousMatches[member1Id] = [];
          }
          if (!previousMatches[member2Id]) {
            previousMatches[member2Id] = [];
          }
          
          // Add if not already present
          if (!previousMatches[member1Id].includes(member2Id)) {
            previousMatches[member1Id].push(member2Id);
            totalPairsAdded++;
          }
          if (!previousMatches[member2Id].includes(member1Id)) {
            previousMatches[member2Id].push(member1Id);
          }
        }
      }
      
      // Store group info for confirmation
      const groupNames = group.map(id => {
        const member = members.find(m => m.slackId === id);
        return member?.name || id;
      });
      addedGroups.push(groupNames.join(", "));
    }
    
    // Save to Firestore if any changes
    if (totalPairsAdded > 0) {
      existingData.previousMatches = previousMatches;
      await saveMembersData(existingData);
    }
    
    // Build success message
    let message = `✅ Successfully added ${addedGroups.length} group(s)!\n\n`;
    
    if (addedGroups.length > 0) {
      message += `*Added groups:*\n`;
      addedGroups.forEach((groupNames, index) => {
        message += `${index + 1}. ${groupNames}\n`;
      });
      message += `\n*Total pairs added:* ${totalPairsAdded}\n\n`;
    }
    
    if (skippedGroups.length > 0) {
      message += `*Skipped groups (already exist):*\n`;
      skippedGroups.forEach((groupNames, index) => {
        message += `${index + 1}. ${groupNames}\n`;
      });
    }
    
    message += `\nThese groups will now be avoided in future matchy generations.`;
    
    // Show success message
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Manage Matches"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message
            }
          }
        ]
      }
    });
    
  } catch (error) {
    console.error("Error handling manage matches submission:", error);
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Manage Matches"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `❌ Error adding match: ${error.message}`
            }
          }
        ]
      }
    });
  }
};

// Handle button action to remove a match (can be a pair or group)
const handleRemoveMatch = async ({ ack, body, client, action }) => {
  try {
    await ack();
    
    if (!action || !action.value) {
      throw new Error("No match information provided.");
    }
    
    const groupKey = action.value; // Format: "memberId1-memberId2" or "memberId1-memberId2-memberId3"
    const memberIds = groupKey.split('-');
    
    // Load existing data
    const existingData = await loadMembersData();
    const previousMatches = existingData.previousMatches || {};
    const members = existingData.members || [];
    
    // Remove all pairs within the group (bidirectional)
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const member1Id = memberIds[i];
        const member2Id = memberIds[j];
        
        // Remove bidirectional
        if (previousMatches[member1Id]) {
          previousMatches[member1Id] = previousMatches[member1Id].filter(id => id !== member2Id);
        }
        if (previousMatches[member2Id]) {
          previousMatches[member2Id] = previousMatches[member2Id].filter(id => id !== member1Id);
        }
      }
    }
    
    // Save to Firestore
    existingData.previousMatches = previousMatches;
    await saveMembersData(existingData);
    
    // Get member names for confirmation
    const memberNames = memberIds.map(id => {
      const member = members.find(m => m.slackId === id);
      return member?.name || id;
    });
    
    let groupText;
    if (memberNames.length === 2) {
      groupText = `*${memberNames[0]}* ↔ *${memberNames[1]}*`;
    } else {
      groupText = `*${memberNames.join('*, *')}*`;
    }
    
    const channelId = body.channel?.id || body.user?.id;
    if (channelId) {
      await client.chat.postMessage({
        channel: channelId,
        text: `✅ Removed match group: ${groupText}\n\nAll pairs in this group have been removed. These members can now be matched again in future generations.`
      });
    }
    
  } catch (error) {
    console.error("Error removing match:", error);
    const errorChannelId = body.channel?.id || body.user?.id;
    if (errorChannelId) {
      await client.chat.postMessage({
        channel: errorChannelId,
        text: `❌ Error removing match: ${error.message}`
      });
    }
  }
};

// Import previous matches into Firestore
const importPreviousMatches = async ({ ack, respond }) => {
  try {
    await ack();
    
    const previousMatchesToImport = {
      'U07TQSU7RRN': [ 'U09NUBZ9WNL', 'U07SZAAUR9T' ],
      'U062JQHTE5V': [ 'U07TQVBJEGG', 'U09ND0DFM4H' ],
      'U07TQVBJEGG': [ 'U062JQHTE5V', 'U07TES7NT17' ],
      'U07U38UUPAP': [ 'U07SVGK7AP8', 'U07SZAAUR9T', 'U09MTLR9UUT' ],
      'U07SVGK7AP8': [ 'U07U38UUPAP', 'U07SZAAUR9T', 'U09MWKB46G5', 'U07T4JEEUSG' ],
      'U07T4JEEUSG': [ 'U09MWKB46G5', 'U07SVGK7AP8' ],
      'U0631Q51G04': [ 'U09MJK632TZ', 'U09MTLTUU3V' ],
      'U09MTLTUU3V': [ 'U09MJK632TZ', 'U0631Q51G04' ],
      'U09MTLR9UUT': [ 'U07U38UUPAP' ],
      'U09MTLWF0GK': [ 'U09ND0CT43B' ],
      'U09MJK632TZ': [ 'U0631Q51G04', 'U09MTLTUU3V' ],
      'U09ND0CT43B': [ 'U09MTLWF0GK' ],
      'U09N03MF96W': [ 'U09MY1H7L5U' ],
      'U09MY1H7L5U': [ 'U09N03MF96W' ],
      'U07T2665RDG': [ 'U07SVEE9QGN' ],
      'U07TES7NT17': [ 'U07TQVBJEGG' ],
      'U09MWKA8X6Z': [ 'U09N03NH62E', 'U09N03EE602' ],
      'U09N03NH62E': [ 'U09MWKA8X6Z', 'U09N03EE602' ],
      'U09N03EE602': [ 'U09MWKA8X6Z', 'U09N03NH62E' ],
      'U09ND0DFM4H': [ 'U062JQHTE5V' ],
      'U09NUBZ9WNL': [ 'U07SZAAUR9T', 'U07TQSU7RRN' ]
    };
    
    // Load existing data
    const existingData = await loadMembersData();
    
    // Start with a fresh object (overwrite, don't merge)
    const currentMatches = {};
    
    // Copy the imported matches
    Object.keys(previousMatchesToImport).forEach(memberId => {
      currentMatches[memberId] = [...previousMatchesToImport[memberId]];
    });
    
    // Ensure bidirectional relationships
    Object.keys(currentMatches).forEach(memberId => {
      currentMatches[memberId].forEach(matchedId => {
        if (!currentMatches[matchedId]) {
          currentMatches[matchedId] = [];
        }
        if (!currentMatches[matchedId].includes(memberId)) {
          currentMatches[matchedId].push(memberId);
        }
      });
    });
    
    // Save to Firestore (overwrite existing matches)
    existingData.previousMatches = currentMatches;
    await saveMembersData(existingData);
    
    // Count total pairs
    const totalPairs = Object.keys(currentMatches).reduce((sum, key) => {
      return sum + (currentMatches[key]?.length || 0);
    }, 0) / 2;
    
    const membersWithMatches = Object.keys(currentMatches).filter(
      memberId => currentMatches[memberId] && currentMatches[memberId].length > 0
    );
    
    await respond(`✅ Successfully imported previous matches!\n\n*Summary:*\n• ${Math.floor(totalPairs)} unique pairs\n• ${membersWithMatches.length} members with match history\n\nAll matches have been saved to Firestore.`);
    
    console.log("Successfully imported previous matches to Firestore");
    
  } catch (error) {
    console.error("Error importing previous matches:", error);
    await respond(`❌ Error importing previous matches: ${error.message}`);
  }
};

// Ensure a temporary match for the next run
const ensure = async ({ ack, respond, command, client }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] /issue executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    const text = (command?.text || "").trim();
    const userIds = new Set();
    const pendingHandles = [];
    
    if (text.length > 0) {
      const tokens = text.split(/[\s,]+/).filter(Boolean);
      tokens.forEach(token => {
        const mentionMatch = token.match(/^<@([A-Z0-9]+)(?:\|[^>]+)?>$/i);
        if (mentionMatch) {
          userIds.add(mentionMatch[1]);
          return;
        }
        const handleMatch = token.match(/^@?([A-Za-z0-9._-]+)$/i);
        if (handleMatch) {
          pendingHandles.push(handleMatch[1].toLowerCase());
        }
      });
    }
    
    if (pendingHandles.length > 0) {
      try {
        const usersResponse = await client.users.list();
        if (usersResponse.ok && Array.isArray(usersResponse.members)) {
          pendingHandles.forEach(handle => {
            const matchedUser = usersResponse.members.find(user => {
              if (!user || user.deleted || user.is_bot) return false;
              const candidateNames = [
                user.name,
                user.profile?.display_name,
                user.profile?.display_name_normalized,
                user.profile?.real_name,
                user.profile?.real_name_normalized
              ]
                .filter(Boolean)
                .map(name => name.toLowerCase());
              return candidateNames.includes(handle);
            });
            if (matchedUser) {
              userIds.add(matchedUser.id);
            }
          });
        }
      } catch (lookupError) {
        console.error("Error looking up Slack users:", lookupError);
      }
    }
    
    const selectedIds = [...userIds];
    
    if (selectedIds.length < 2 || selectedIds.length > 3) {
      await respond("❌ Don't use this command for now. This is for debugging purposes.");
      return;
    }
    
    const data = await loadMembersData();
    const enabledMembers = new Set((data.members || []).filter(member => member.matchyEnabled).map(member => member.slackId));
    
    const unavailable = selectedIds.filter(id => !enabledMembers.has(id));
    if (unavailable.length > 0) {
      const names = unavailable.map(id => `<@${id}>`).join(", ");
      await respond(`❌ These users are not currently enabled for Matchy: ${names}`);
      return;
    }
    
    data.nextMatchOverrides = Array.isArray(data.nextMatchOverrides) ? data.nextMatchOverrides : [];
    data.nextMatchOverrides.push(selectedIds);
    
    await saveMembersData(data);
    
    const memberNames = selectedIds.map(id => {
      const member = data.members.find(m => m.slackId === id);
      return member ? member.name : id;
    });
    
    await respond(`✅ Ensured for next round (${memberNames.length} users)`);
    
  } catch (error) {
    console.error("Error with ensuring:", error);
    await respond("❌ Error with ensuring. Check the logs for details.");
  }
};

const skipNextMatchyWeek = async ({ ack, respond, command }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] skipNextMatchyWeek executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    const data = await loadMembersData();
    
    // Check if matchy is already paused
    if (data.matchyPaused) {
      await respond("⏸️ Matchy generation is already paused. Use `/pr` to toggle it back on first.");
      return;
    }
    
    data.skipNextMatchy = true;
    await saveMembersData(data);
    
    await respond("⏸️ Matchy generation will be skipped for the next scheduled run.");
    console.log("Next Matchy generation has been marked to skip.");
  } catch (error) {
    console.error("Error skipping next matchy week:", error);
    await respond("❌ Error scheduling skip. Check the logs for details.");
  }
};

const toggleMatchyPause = async ({ ack, respond, command }) => {
  try {
    await ack();
    const userId = command?.user_id;
    const userName = command?.user_name;
    console.log(`[COMMAND] /pr (toggleMatchyPause) executed by user: ${userName || 'unknown'} (${userId || 'unknown'})`);
    
    const data = await loadMembersData();
    const wasPaused = data.matchyPaused || false;
    data.matchyPaused = !wasPaused;
    await saveMembersData(data);
    
    if (data.matchyPaused) {
      await respond("⏸️ Matchy generation has been paused. It will remain paused until you toggle it back on with `/matchy-toggle`.");
      console.log("Matchy generation has been paused.");
    } else {
      await respond("▶️ Matchy generation has been resumed. Scheduled runs will now proceed normally.");
      console.log("Matchy generation has been resumed.");
    }
  } catch (error) {
    console.error("Error toggling matchy pause:", error);
    await respond("❌ Error toggling matchy pause. Check the logs for details.");
  }
};

module.exports = {
  addUserToMatchy,
  removeUserFromMatchy,
  generateMatches,
  clearMatchy,
  loadMembersDataCommand,
  exportMembersJSON,
  addNewMemberToJSON,
  openManageMembersModal,
  handleManageMembersSubmitted,
  openManageMatchesModal,
  handleManageMatchesSubmitted,
  handleRemoveMatch,
  importPreviousMatches,
  ensure,
  skipNextMatchyWeek,
  toggleMatchyPause,
};
