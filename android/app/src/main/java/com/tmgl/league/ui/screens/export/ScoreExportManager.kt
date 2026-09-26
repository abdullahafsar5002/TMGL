package com.tmgl.league.ui.screens.export

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ScorecardExportRow(
    val playerName: String,
    val holeNumber: Int,
    val par: Int,
    val strokes: Int
)

object ScoreExportManager {

    fun exportScorecardCsv(context: Context, courseName: String, rows: List<ScorecardExportRow>): Uri? {
        if (rows.isEmpty()) return null
        return try {
            val slug = courseName.trim().ifEmpty { "scorecard" }
                .lowercase(Locale.ROOT)
                .replace(Regex("[^a-z0-9]+"), "_")
                .trim('_')
                .ifEmpty { "scorecard" }
            val file = File(context.cacheDir, "scorecard_${slug}_${System.currentTimeMillis()}.csv")
            FileWriter(file).use { writer ->
                writer.appendLine("Scorecard - $courseName")
                writer.appendLine("Generated,${generatedAt()}")
                writer.appendLine()
                writer.appendLine("Player,Hole,Par,Score,To Par")
                rows.sortedWith(compareBy({ it.playerName.lowercase(Locale.ROOT) }, { it.holeNumber }))
                    .forEach { row ->
                        writer.appendLine(
                            "${csvCell(row.playerName)},${row.holeNumber},${row.par},${row.strokes},${row.strokes - row.par}"
                        )
                    }
                writer.appendLine()
                writer.appendLine("Player,Holes,Par,Score,To Par")
                rows.groupBy { it.playerName }
                    .toSortedMap(compareBy { it.lowercase(Locale.ROOT) })
                    .forEach { (player, playerRows) ->
                        val par = playerRows.sumOf { it.par }
                        val strokes = playerRows.sumOf { it.strokes }
                        writer.appendLine("${csvCell(player)},${playerRows.size},$par,$strokes,${strokes - par}")
                    }
            }
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        } catch (e: Exception) {
            null
        }
    }

    private fun csvCell(value: String): String =
        if (value.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) {
            "\"" + value.replace("\"", "\"\"") + "\""
        } else {
            value
        }

    private fun generatedAt(): String =
        SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())

    fun shareFile(context: Context, uri: Uri, mimeType: String = "text/csv", title: String = "Share Scores") {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, title))
    }
}
