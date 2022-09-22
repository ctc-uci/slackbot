const Bot = require('./bot');

const ConfigModel = require('../models/config.model');
const UserModel = require('../models/user.model');
const messages = require("./msgs");

// const MATCHY_CHANNEL_ID = 'C01FL4VCE1Z';
const MATCHY_CHANNEL_ID = 'G01G9QGG0KA';

// List of bot slack ids
const BLACKLISTED = ['U041UN26V5M', 'U01FL56JDSP'];

// List of members used for testing (All board members xd)
const MEMBERS_TEST_LIST = [
  'U01D37G164B',
  'U01CZU6U0KX',
  'U02FE6BFJMC',
  'U02HUR2J3GT',
  'U01D965LR8U',
  'U02FLU7T5GA',
  'U02HCPB8RPH',
  'U02JH2R1U00',
  'U01D2RMHF9T',
  'U02HXQ38M6G',
  'U011G75JVBN',
  'U02HS1ALZJ9',
  'U01DFKX0RG9',
]

// Changes list of slack IDs to real names
// Useful for debugging
const humanizeMembers = async (members) => {
  return (await Promise.allSettled(members.map(member => getUserInfo(member)))).map(member => member.value.user.real_name);
}

// Changes dictionary of previous matches with slack IDs to real names
// Useful for debugging
const humanizePreviousMatches = async (previousMatches) => {
  const res = {};
  for (root in previousMatches) {
    const newRoot = (await getUserInfo(root)).user.real_name;
    const temp = await Promise.allSettled(previousMatches[root].map(previous => getUserInfo(previous)));
    res[newRoot] = temp.map(user => user.value.user.real_name);
  }
  return res;
}

// Changes list of current matches with slack IDs to real names
// Useful for debugging
const humanizeCurrentMatches = async (currentMatches) => {
  const res = [];
  for (const match of currentMatches) {
    const temp = await Promise.allSettled(match.map(person => getUserInfo(person)));
    res.push(temp.map(user => user.value.user.real_name));
  }
  return res;
}

// Helper function to get a user's information from slack ID
// Useful for debugging
const getUserInfo = async (user) => {
  const info = await Bot.client.users.info({ user });
  return info;
}

// Helper function used to clear Matchy
// TODO: REMOVE WHEN DONE WITH DEV OR MAKE THIS ADMIN ONLY
const clearMatchy = async () => {
  await ConfigModel.findOneAndUpdate(
    { key: 'previousMatches' },
    {
      value: {}
    }
  );
}

// Fisher-Yates shuffle
// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
const shuffle = (array) => {
  const newArray = new Array(...array);
  let currentIndex = newArray.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }

  return newArray;
}

// Function to get all members in a matchy meetup channel
// Deprecated for 2022
const getMembersInMatchyChannel = async (channel) => {
  const users = await Bot.client.conversations.members({ channel, });
  return users.members.filter(user => !BLACKLISTED.includes(user));
}

// Function to get all members signed up for Matchy according to MongoDB
const getMembersFromMongoDB = async () => {
  const members = await UserModel.find({});
  return members
    .filter(member => member.matchyEnabled)
    .map(member => member.slackId);
}

// Gets a dictionary of all previous matches
const getPreviousMatches = async () => {
  let config;
  try {
    config = await ConfigModel.find({ key: 'previousMatches' });
  } catch (err) {
    console.log(err.message);
  }
  // Will be undefined the first time matchy is ran
  return !config[0]?.value ? {} : config[0].value;
}

const validPairing = (member, potentialPartner, previousMatches) => {
  // 1. Member can't be matched with themselves
  // 2. Member can't be matched with someone they already matched with
  return potentialPartner !== member && !previousMatches[member]?.includes(potentialPartner);
}

// Valid triplet means that the extraMember hasn't met with at least 1 person in a pair
// const validTriplet = (extraMember, potentialPair, previousMatches) => {
//   const [memberA, memberB] = potentialPair;
//   return !(previousMatches[memberA]?.includes(extraMember) && previousMatches[memberB]?.includes(extraMember));
// }

// Generate matchy groups
const getMatches = async (members, previousMatches) => {
  const currentMatches = [];
  const partnered = new Set();

  let extraMember;
  let filteredMembers = members;
  // If # of members is odd, remove one temporarily and add them to a random group of 2
  if (members.length % 2) {
    const indexToIgnore = Math.floor(Math.random() * members.length);
    extraMember = members[indexToIgnore];
    filteredMembers = members.filter((member, index) => index !== indexToIgnore);
  }

  // This shuffled array is used to determine partners randomly
  // This is only to make sure that in case MongoDB is erased for whatever reason,
  // the matchings will still be random (the actual pairings are made greedily)
  const shuffledFilteredMembers = shuffle(filteredMembers);

  // Greedily set matches
  filteredMembers.forEach(member => {
    // If this member already has a pair, don't do anything
    if (partnered.has(member)) return;
    let partnerFound = false;
    shuffledFilteredMembers.every(potentialPartner => {
      // If this member already has a pair, don't do anything
      if (partnered.has(potentialPartner)) return true;
      const valid = validPairing(member, potentialPartner, previousMatches);
      // Check if this pair is a valid pairing
      if (valid) {
        // Add current pair to the final matches
        currentMatches.push([member, potentialPartner]);
        partnered.add(member);
        partnered.add(potentialPartner);
        partnerFound = true;
      }
      return !valid;
    })

    // If no partner was found, find someone random who doesn't have a partner yet
    // TODO: LRU would be nice but too hard to implement for now
    if (!partnerFound) {
      const potentials = filteredMembers.filter(potential => potential !== member && !partnered.has(potential));
      const index = Math.floor(Math.random() * potentials.length);
      const partner = potentials[index];
      currentMatches.push([member, partner]);
      partnered.add(member);
      partnered.add(partner);
    }
  })
  if (extraMember) {
    const index = Math.floor(Math.random() * currentMatches.length);
    currentMatches[index].push(extraMember);
  }
  return currentMatches;
}

// Processes a single match (pair or triplet)
const processMatch = async (match, previousMatches) => {
  match.forEach(async (root) => {
    match.forEach(async (other) => {
      if (other === root) return;
      if (!previousMatches[root]) previousMatches[root] = [];
      if (!previousMatches[root].includes(other)) previousMatches[root].push(other);
    })
  })
}

// Processes the current matches and updates previous matches
const updateCurrentAndPreviousMatches = async (currentMatches, previousMatches) => {
  for (const match of currentMatches) {
    await processMatch(match, previousMatches);
  }

  // Store the new currentMatches object into MongoDB
  // Store the new previousMatches object into MongoDB
  const requests = [
    ConfigModel.findOneAndUpdate(
      { key: 'currentMatches' },
      {
        value: currentMatches,
      }
    ),
    ConfigModel.findOneAndUpdate(
      { key: 'previousMatches' },
      {
        value: previousMatches
      }
    )
  ]

  await Promise.all(requests);
}

// Creates group chats for all matches and sends intro messages
const createGroupChats = async (currentMatches) => {
  for (const match of currentMatches) {
    const users = match.join(',')
    const newGroupId = (await Bot.client.conversations.open({ users })).channel.id;
    await Bot.client.chat.postMessage({
      channel: newGroupId,
      text: messages.matchy.intro(match),
    })
  }
}

// Generates matchy meetups
// This is ran once a week every Thursday
const generateMatchyMeetups = async ({ ack }) => {
  await ack();
  // Get all previous matches
  const previousMatches = await getPreviousMatches();

  // Get all members in #matchy
  // const members = MEMBERS_TEST_LIST;
  // const members = await getMembersInMatchyChannel(MATCHY_CHANNEL_ID);
  const members = await getMembersFromMongoDB();

  if (members.length > 1) {
    // Sort the members by # of previous partners in ascending order
    // Prioritizes people who've met less people so they can meet everyone
    members.sort((a, b) => {
      const first = a in previousMatches ? previousMatches[a].length : 0;
      const second = b in previousMatches ? previousMatches[b].length : 0;
      return first < second ? -1 : (first > second ? 1 : 0);
    })

    // Generate matches for this week
    const currentMatches = await getMatches(members, previousMatches);

    // Update the previous matches in MongoDB
    await updateCurrentAndPreviousMatches(currentMatches, previousMatches);

    // Create group chats and send intro message
    await createGroupChats(currentMatches);
  }
}

module.exports = {
  generateMatchyMeetups,
  clearMatchy
}