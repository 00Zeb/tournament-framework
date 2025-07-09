const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

const DATA_DIR = path.join(__dirname, '..', '..', 'cli', 'data');

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function getTournamentList() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const tournaments = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const tournamentData = await readJsonFile(path.join(DATA_DIR, file));
        if (tournamentData) {
          tournaments.push({
            name: tournamentData.name,
            createdAt: tournamentData.createdAt,
            participants: tournamentData.participants.length,
            matches: tournamentData.matches.length,
            status: tournamentData.status
          });
        }
      }
    }
    
    return tournaments;
  } catch (error) {
    return [];
  }
}

async function getTournamentData(tournamentName) {
  const filePath = path.join(DATA_DIR, `${tournamentName}.json`);
  return await readJsonFile(filePath);
}

function calculateStandings(tournament) {
  return tournament.participants
    .map(p => ({
      name: p.name,
      gamesPlayed: p.stats.gamesPlayed,
      wins: p.stats.wins,
      losses: p.stats.losses,
      draws: p.stats.draws,
      totalScore: p.stats.totalScore,
      winRate: p.stats.gamesPlayed > 0 ? (p.stats.wins / p.stats.gamesPlayed) : 0,
      avgScore: p.stats.gamesPlayed > 0 ? (p.stats.totalScore / p.stats.gamesPlayed) : 0
    }))
    .sort((a, b) => {
      if (a.winRate !== b.winRate) return b.winRate - a.winRate;
      if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
      return b.wins - a.wins;
    });
}

app.get('/', async (req, res) => {
  try {
    const tournaments = await getTournamentList();
    res.render('index', { tournaments });
  } catch (error) {
    res.status(500).render('error', { error: 'Failed to load tournaments' });
  }
});

app.get('/tournament/:name', async (req, res) => {
  try {
    const tournament = await getTournamentData(req.params.name);
    
    if (!tournament) {
      return res.status(404).render('error', { error: 'Tournament not found' });
    }
    
    const standings = calculateStandings(tournament);
    const recentMatches = tournament.matches
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
      .slice(0, 10);
    
    res.render('tournament', { 
      tournament, 
      standings, 
      recentMatches 
    });
  } catch (error) {
    res.status(500).render('error', { error: 'Failed to load tournament data' });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const tournaments = await getTournamentList();
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tournaments' });
  }
});

app.get('/api/tournament/:name', async (req, res) => {
  try {
    const tournament = await getTournamentData(req.params.name);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const standings = calculateStandings(tournament);
    
    res.json({
      tournament: {
        name: tournament.name,
        createdAt: tournament.createdAt,
        status: tournament.status,
        participants: tournament.participants.length,
        matches: tournament.matches.length,
        settings: tournament.settings
      },
      standings,
      recentMatches: tournament.matches
        .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
        .slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tournament data' });
  }
});

app.get('/api/tournament/:name/matches', async (req, res) => {
  try {
    const tournament = await getTournamentData(req.params.name);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const matches = tournament.matches
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

app.use((req, res) => {
  res.status(404).render('error', { error: 'Page not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Tournament web server running on http://localhost:${PORT}`);
});

module.exports = app;