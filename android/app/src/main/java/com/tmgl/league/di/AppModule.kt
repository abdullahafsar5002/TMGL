package com.tmgl.league.di

import android.content.Context
import com.tmgl.league.auth.BiometricAuthManager
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.CourseRepository
import com.tmgl.league.data.repository.FriendlyMatchRepository
import com.tmgl.league.data.repository.HandicapRepository
import com.tmgl.league.data.repository.LeagueRepository
import com.tmgl.league.data.repository.LiveScoringRepository
import com.tmgl.league.data.repository.PracticeRepository
import com.tmgl.league.data.repository.ScoringFormatsRepository
import com.tmgl.league.data.repository.SocialRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideEncryptedAuthStorage(@ApplicationContext context: Context): EncryptedAuthStorage {
        return EncryptedAuthStorage(context)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(encryptedStorage: EncryptedAuthStorage): AuthRepository {
        return AuthRepository(encryptedStorage)
    }

    @Provides
    @Singleton
    fun provideBiometricAuthManager(@ApplicationContext context: Context): BiometricAuthManager {
        return BiometricAuthManager(context)
    }

    @Provides
    @Singleton
    fun provideCompetitionRepository(): CompetitionRepository = CompetitionRepository()

    @Provides
    @Singleton
    fun provideSocialRepository(): SocialRepository = SocialRepository()

    @Provides
    @Singleton
    fun provideLeagueRepository(): LeagueRepository = LeagueRepository()

    @Provides
    @Singleton
    fun provideFriendlyMatchRepository(): FriendlyMatchRepository = FriendlyMatchRepository()

    @Provides
    @Singleton
    fun providePracticeRepository(): PracticeRepository = PracticeRepository()

    @Provides
    @Singleton
    fun provideNetworkMonitor(@ApplicationContext context: Context): NetworkMonitor = NetworkMonitor(context)

    @Provides
    @Singleton
    fun provideHandicapRepository(): HandicapRepository = HandicapRepository()

    @Provides
    @Singleton
    fun provideCourseRepository(): CourseRepository = CourseRepository()

    @Provides
    @Singleton
    fun provideLiveScoringRepository(): LiveScoringRepository = LiveScoringRepository()

    @Provides
    @Singleton
    fun provideScoringFormatsRepository(): ScoringFormatsRepository = ScoringFormatsRepository()

    @Provides
    @Singleton
    fun provideGlobalErrorHandler(): GlobalErrorHandler = GlobalErrorHandler()
}
