package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.ui.theme.*
import com.tmgl.league.data.model.ScoringFormat

@Composable
fun ScoringFormatSelector(
    selectedFormat: ScoringFormat,
    onFormatSelected: (ScoringFormat) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = "Scoring Format",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = TmglGold
        )
        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ScoringFormat.entries.forEach { format ->
                FilterChip(
                    selected = selectedFormat == format,
                    onClick = { onFormatSelected(format) },
                    label = {
                        Text(
                            text = format.displayName,
                            fontSize = 12.sp
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = TmglGold,
                        selectedLabelColor = MaterialTheme.colorScheme.background
                    )
                )
            }
        }
    }
}
