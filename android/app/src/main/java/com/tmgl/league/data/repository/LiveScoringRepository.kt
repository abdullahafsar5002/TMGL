package com.tmgl.league.data.repository

import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.ValueEventListener
import com.google.firebase.database.ChildEventListener
import com.tmgl.league.data.model.ScorecardHole
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LiveScoringRepository @Inject constructor() {

    private val database = FirebaseDatabase.getInstance()

    fun getLiveScores(roundId: String): Flow<List<ScorecardHole>> = callbackFlow {
        val scoresRef = database.getReference("live_scores/$roundId")
        val scores = mutableListOf<ScorecardHole>()

        val listener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(ScorecardHole::class.java)?.let { score ->
                    scores.removeAll { it.holeNumber == score.holeNumber }
                    scores.add(score)
                    trySend(scores.toList())
                }
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(ScorecardHole::class.java)?.let { score ->
                    scores.removeAll { it.holeNumber == score.holeNumber }
                    scores.add(score)
                    trySend(scores.toList())
                }
            }

            override fun onChildRemoved(snapshot: DataSnapshot) {
                snapshot.getValue(ScorecardHole::class.java)?.let { score ->
                    scores.removeAll { it.holeNumber == score.holeNumber }
                    trySend(scores.toList())
                }
            }

            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        }

        scoresRef.addChildEventListener(listener)
        awaitClose { scoresRef.removeEventListener(listener) }
    }

    fun pushScore(roundId: String, hole: Int, score: ScorecardHole) {
        val scoresRef = database.getReference("live_scores/$roundId/$hole")
        scoresRef.setValue(score)
    }

    fun getLiveLeaderboard(tournamentId: String): Flow<List<LiveLeaderboardEntry>> = callbackFlow {
        val leaderboardRef = database.getReference("live_leaderboard/$tournamentId")
        val entries = mutableListOf<LiveLeaderboardEntry>()

        val listener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(LiveLeaderboardEntry::class.java)?.let { entry ->
                    entries.removeAll { it.playerId == entry.playerId }
                    entries.add(entry)
                    entries.sortBy { it.totalScore }
                    trySend(entries.toList())
                }
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(LiveLeaderboardEntry::class.java)?.let { entry ->
                    entries.removeAll { it.playerId == entry.playerId }
                    entries.add(entry)
                    entries.sortBy { it.totalScore }
                    trySend(entries.toList())
                }
            }

            override fun onChildRemoved(snapshot: DataSnapshot) {
                snapshot.getValue(LiveLeaderboardEntry::class.java)?.let { entry ->
                    entries.removeAll { it.playerId == entry.playerId }
                    trySend(entries.toList())
                }
            }

            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        }

        leaderboardRef.addChildEventListener(listener)
        awaitClose { leaderboardRef.removeEventListener(listener) }
    }

    fun updateLeaderboard(tournamentId: String, entry: LiveLeaderboardEntry) {
        val leaderboardRef = database.getReference("live_leaderboard/$tournamentId/${entry.playerId}")
        leaderboardRef.setValue(entry)
    }

    fun getActivePlayers(roundId: String): Flow<List<ActivePlayer>> = callbackFlow {
        val activeRef = database.getReference("active_players/$roundId")
        val players = mutableListOf<ActivePlayer>()

        val listener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(ActivePlayer::class.java)?.let { player ->
                    players.removeAll { it.playerId == player.playerId }
                    players.add(player)
                    trySend(players.toList())
                }
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                snapshot.getValue(ActivePlayer::class.java)?.let { player ->
                    players.removeAll { it.playerId == player.playerId }
                    players.add(player)
                    trySend(players.toList())
                }
            }

            override fun onChildRemoved(snapshot: DataSnapshot) {
                snapshot.getValue(ActivePlayer::class.java)?.let { player ->
                    players.removeAll { it.playerId == player.playerId }
                    trySend(players.toList())
                }
            }

            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        }

        activeRef.addChildEventListener(listener)
        awaitClose { activeRef.removeEventListener(listener) }
    }

    fun setActivePlayer(roundId: String, player: ActivePlayer) {
        val activeRef = database.getReference("active_players/$roundId/${player.playerId}")
        activeRef.setValue(player)
    }

    fun removeActivePlayer(roundId: String, playerId: String) {
        val activeRef = database.getReference("active_players/$roundId/$playerId")
        activeRef.removeValue()
    }

    suspend fun saveLiveScore(roundId: String, hole: Int, score: ScorecardHole) {
        pushScore(roundId, hole, score)
    }
}

data class LiveLeaderboardEntry(
    val playerId: String = "",
    val playerName: String = "",
    val totalScore: Int = 0,
    val holesCompleted: Int = 0,
    val currentHole: Int = 1,
    val status: String = "playing",
    val timestamp: Long = System.currentTimeMillis()
)

data class ActivePlayer(
    val playerId: String = "",
    val playerName: String = "",
    val currentHole: Int = 1,
    val score: Int = 0,
    val timestamp: Long = System.currentTimeMillis()
)
