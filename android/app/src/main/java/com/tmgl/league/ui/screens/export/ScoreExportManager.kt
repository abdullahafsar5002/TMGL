package com.tmgl.league.ui.screens.export

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileWriter

data class ExportableScore(
    val playerName: String,
    val date: String,
    val course: String,
    val holeScores: List<Pair<Int, Int>>,
    val totalScore: Int,
    val toPar: Int
)

object ScoreExportManager {

    fun exportCsv(context: Context, scores: List<ExportableScore>, fileName: String = "tmgl_scores"): Uri? {
        return try {
            val file = File(context.cacheDir, "$fileName.csv")
            FileWriter(file).use { writer ->
                writer.appendLine("Player,Date,Course,Holes,Total Score,To Par")
                scores.forEach { score ->
                    val holes = score.holeScores.joinToString(";") { "${it.first}:${it.second}" }
                    writer.appendLine("\"${score.playerName}\",\"${score.date}\",\"${score.course}\",\"$holes\",${score.totalScore},${score.toPar}")
                }
            }
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        } catch (e: Exception) {
            null
        }
    }

    fun exportScorecardCsv(context: Context, playerName: String, holes: List<Triple<Int, Int, Int>>, courseName: String): Uri? {
        return try {
            val file = File(context.cacheDir, "scorecard_${playerName.replace(" ", "_")}.csv")
            FileWriter(file).use { writer ->
                writer.appendLine("Scorecard - $playerName - $courseName")
                writer.appendLine()
                writer.appendLine("Hole,Par,Score")
                holes.forEach { (hole, par, score) ->
                    writer.appendLine("$hole,$par,$score")
                }
                val totalScore = holes.sumOf { it.third }
                val totalPar = holes.sumOf { it.second }
                writer.appendLine()
                writer.appendLine("Total,$totalPar,$totalScore")
                writer.appendLine("To Par,${totalScore - totalPar}")
            }
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        } catch (e: Exception) {
            null
        }
    }

    fun shareFile(context: Context, uri: Uri, mimeType: String = "text/csv", title: String = "Share Scores") {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, title))
    }
}
