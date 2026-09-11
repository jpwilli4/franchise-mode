const https = require('https');

const FIREBASE_DB_URL = 'https://franchise-mode-pickem-default-rtdb.firebaseio.com';

function httpGet(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response from ' + url)); }
      });
    }).on('error', reject);
  });
}

function httpPut(url, body) {
  return new Promise(function(resolve, reject) {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, function(res) {
      let resp = '';
      res.on('data', function(chunk) { resp += chunk; });
      res.on('end', function() { resolve(resp); });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function firebaseGet(path) {
  return httpGet(FIREBASE_DB_URL + path + '.json');
}

function firebasePut(path, data) {
  return httpPut(FIREBASE_DB_URL + path + '.json', data);
}

module.exports = async function handler(req, res) {
  try {
    const slateData = await firebaseGet('/pickem/active');
    if (!slateData || !slateData.season || !slateData.week || !slateData.games) {
      return res.status(200).json({ message: 'No active slate configured in Firebase.' });
    }

    const season = slateData.season;
    const week = slateData.week;
    const nflWeek = slateData.nflWeek || week;
    const games = slateData.games;

    const existingResults = await firebaseGet('/pickem/' + season + '/week' + week + '/results');
    const allScored = existingResults && Object.keys(existingResults).length === Object.keys(games).length &&
      Object.values(existingResults).every(function(r) { return r.winner; });

    if (allScored) {
      return res.status(200).json({ message: 'All games already scored for week ' + week + '.' });
    }

    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=' + nflWeek + '&seasontype=2&dates=' + season;
    let espnData;
    try {
      espnData = await httpGet(espnUrl);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch ESPN scores', details: e.message });
    }

    if (!espnData || !espnData.events) {
      return res.status(200).json({ message: 'No ESPN events found for week ' + nflWeek + '.' });
    }

    const nflResults = {};
    espnData.events.forEach(function(event) {
      const competition = event.competitions && event.competitions[0];
      if (!competition) return;

      const isComplete = competition.status && competition.status.type && competition.status.type.completed;
      if (!isComplete) return;

      const competitors = competition.competitors || [];
      const homeTeam = competitors.find(function(c) { return c.homeAway === 'home'; });
      const awayTeam = competitors.find(function(c) { return c.homeAway === 'away'; });
      if (!homeTeam || !awayTeam) return;

      const homeName = homeTeam.team.shortDisplayName || homeTeam.team.displayName;
      const awayName = awayTeam.team.shortDisplayName || awayTeam.team.displayName;
      const homeScore = parseInt(homeTeam.score, 10);
      const awayScore = parseInt(awayTeam.score, 10);

      nflResults[awayName + ' @ ' + homeName] = {
        home: homeName,
        away: awayName,
        homeScore: homeScore,
        awayScore: awayScore,
        winner: homeScore > awayScore ? homeName : (awayScore > homeScore ? awayName : 'TIE')
      };

      nflResults[homeTeam.team.displayName] = nflResults[awayName + ' @ ' + homeName];
      nflResults[awayTeam.team.displayName] = nflResults[awayName + ' @ ' + homeName];
      nflResults[homeTeam.team.abbreviation] = nflResults[awayName + ' @ ' + homeName];
      nflResults[awayTeam.team.abbreviation] = nflResults[awayName + ' @ ' + homeName];
      if (homeTeam.team.shortDisplayName) nflResults[homeTeam.team.shortDisplayName] = nflResults[awayName + ' @ ' + homeName];
      if (awayTeam.team.shortDisplayName) nflResults[awayName + ' @ ' + homeName];
    });

    const updatedResults = existingResults || {};
    let matched = 0;

    Object.keys(games).forEach(function(gameId) {
      if (updatedResults[gameId] && updatedResults[gameId].winner) return;

      const game = games[gameId];
      const homeKey = game.home;
      const awayKey = game.away;

      let found = nflResults[homeKey] || nflResults[awayKey] ||
        nflResults[awayKey + ' @ ' + homeKey];

      if (found) {
        updatedResults[gameId] = {
          winner: found.winner === found.home ? game.home : (found.winner === found.away ? game.away : 'TIE'),
          homeScore: found.homeScore,
          awayScore: found.awayScore
        };
        matched++;
      }
    });

    if (matched > 0) {
      await firebasePut('/pickem/' + season + '/week' + week + '/results', updatedResults);
    }

    return res.status(200).json({
      message: 'Processed week ' + week + '. Matched ' + matched + ' new results.',
      totalResults: Object.keys(updatedResults).length,
      totalGames: Object.keys(games).length
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
