import { users, songs, userProgress, vocabulary, type User, type InsertUser, type Song, type InsertSong, type UserProgress, type InsertUserProgress, type Vocabulary, type InsertVocabulary } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Song methods
  getSongs(filters?: { genre?: string; difficulty?: string; language?: string }): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;

  // User progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserProgressBySong(userId: number, songId: number): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: number, updates: Partial<UserProgress>): Promise<UserProgress>;

  // Vocabulary methods
  getUserVocabulary(userId: number): Promise<Vocabulary[]>;
  createVocabulary(vocabulary: InsertVocabulary): Promise<Vocabulary>;
  updateVocabulary(id: number, updates: Partial<Vocabulary>): Promise<Vocabulary>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private songs: Map<number, Song>;
  private userProgress: Map<number, UserProgress>;
  private vocabulary: Map<number, Vocabulary>;
  private currentUserId: number;
  private currentSongId: number;
  private currentProgressId: number;
  private currentVocabularyId: number;

  constructor() {
    this.users = new Map();
    this.songs = new Map();
    this.userProgress = new Map();
    this.vocabulary = new Map();
    this.currentUserId = 1;
    this.currentSongId = 1;
    this.currentProgressId = 1;
    this.currentVocabularyId = 1;
    
    // Initialize with some sample songs
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleSongs: InsertSong[] = [
      {
        title: "Despacito",
        artist: "Luis Fonsi ft. Daddy Yankee",
        genre: "Pop",
        language: "es",
        difficulty: "A2",
        rating: 48,
        albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 227,
        lyrics: [
          { text: "Sí, sabes que ya llevo un rato mirándote", timestamp: 0, translation: "Yes, you know I've been watching you for a while" },
          { text: "Tengo que bailar contigo hoy", timestamp: 4, translation: "I have to dance with you today" },
          { text: "Vi que tu mirada ya estaba llamándome", timestamp: 8, translation: "I saw your gaze was already calling me" },
          { text: "Muéstrame el camino que yo voy", timestamp: 12, translation: "Show me the way that I'm going" }
        ]
      },
      {
        title: "Volare",
        artist: "Domenico Modugno",
        genre: "Classic",
        language: "it",
        difficulty: "B1",
        rating: 46,
        albumCover: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 185,
        lyrics: [
          { text: "Volare, oh oh", timestamp: 0, translation: "To fly, oh oh" },
          { text: "Cantare, oh oh oh oh", timestamp: 4, translation: "To sing, oh oh oh oh" },
          { text: "Nel blu dipinto di blu", timestamp: 8, translation: "In the blue painted blue" },
          { text: "Felice di stare lassù", timestamp: 12, translation: "Happy to be up there" }
        ]
      },
      {
        title: "La Vie en Rose",
        artist: "Édith Piaf",
        genre: "Chanson",
        language: "fr",
        difficulty: "B2",
        rating: 49,
        albumCover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 205,
        lyrics: [
          { text: "Quand il me prend dans ses bras", timestamp: 0, translation: "When he takes me in his arms" },
          { text: "Il me parle tout bas", timestamp: 4, translation: "He speaks to me softly" },
          { text: "Je vois la vie en rose", timestamp: 8, translation: "I see life in pink" },
          { text: "Il me dit des mots d'amour", timestamp: 12, translation: "He tells me words of love" }
        ]
      },
      {
        title: "Alors on Danse",
        artist: "Stromae",
        genre: "Electronic",
        language: "fr",
        difficulty: "A2",
        rating: 47,
        albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 212,
        lyrics: [
          { text: "Alors on danse", timestamp: 0, translation: "So we dance" },
          { text: "Alors on danse", timestamp: 4, translation: "So we dance" },
          { text: "Alors on danse", timestamp: 8, translation: "So we dance" },
          { text: "Alors on danse", timestamp: 12, translation: "So we dance" }
        ]
      },
      {
        title: "Hips Don't Lie",
        artist: "Shakira",
        genre: "Pop",
        language: "es",
        difficulty: "B1",
        rating: 46,
        albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 218,
        lyrics: [
          { text: "No fighting", timestamp: 0, translation: "No fighting" },
          { text: "I never really knew that she could dance like this", timestamp: 4, translation: "I never really knew that she could dance like this" },
          { text: "She makes a man want to speak Spanish", timestamp: 8, translation: "She makes a man want to speak Spanish" },
          { text: "¿Cómo se llama? ¡Bonita!", timestamp: 12, translation: "What's her name? Beautiful!" }
        ]
      },
      {
        title: "Waka Waka",
        artist: "Shakira",
        genre: "World",
        language: "es",
        difficulty: "A2",
        rating: 45,
        albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 201,
        lyrics: [
          { text: "Waka waka, eh eh", timestamp: 0, translation: "Waka waka, eh eh" },
          { text: "Tsamina mina zangalewa", timestamp: 4, translation: "Tsamina mina zangalewa" },
          { text: "Porque esto es África", timestamp: 8, translation: "Because this is Africa" },
          { text: "Tsamina mina, eh eh", timestamp: 12, translation: "Tsamina mina, eh eh" }
        ]
      },
      {
        title: "99 Luftballons",
        artist: "Nena",
        genre: "Rock",
        language: "de",
        difficulty: "B2",
        rating: 42,
        albumCover: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 235,
        lyrics: [
          { text: "Hast du etwas Zeit für mich", timestamp: 0, translation: "Do you have some time for me" },
          { text: "Dann singe ich ein Lied für dich", timestamp: 4, translation: "Then I'll sing a song for you" },
          { text: "Von 99 Luftballons", timestamp: 8, translation: "About 99 balloons" },
          { text: "Auf ihrem Weg zum Horizont", timestamp: 12, translation: "On their way to the horizon" }
        ]
      },
      {
        title: "Mambo No. 5",
        artist: "Lou Bega",
        genre: "Latin",
        language: "en",
        difficulty: "A1",
        rating: 43,
        albumCover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 219,
        lyrics: [
          { text: "One, two, three, four, five", timestamp: 0, translation: "One, two, three, four, five" },
          { text: "Everybody in the car, so come on", timestamp: 4, translation: "Everybody in the car, so come on" },
          { text: "Let's ride to the liquor store", timestamp: 8, translation: "Let's ride to the liquor store" },
          { text: "Around the corner", timestamp: 12, translation: "Around the corner" }
        ]
      },
      {
        title: "Gangnam Style",
        artist: "PSY",
        genre: "Hip-Hop",
        language: "ko",
        difficulty: "B1",
        rating: 44,
        albumCover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400",
        audioUrl: "",
        duration: 219,
        lyrics: [
          { text: "오빤 강남스타일", timestamp: 0, translation: "Big brother is Gangnam style" },
          { text: "강남스타일", timestamp: 4, translation: "Gangnam style" },
          { text: "낮에는 따사로운 인간적인 여자", timestamp: 8, translation: "A girl who is warm and humanlike during the day" },
          { text: "커피 한잔의 여유를 아는 품격 있는 여자", timestamp: 12, translation: "A classy girl who knows how to enjoy the freedom of a cup of coffee" }
        ]
      }
    ];

    sampleSongs.forEach(song => {
      this.createSong(song);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      nativeLanguage: insertUser.nativeLanguage || "en",
      targetLanguage: insertUser.targetLanguage || "es",
      level: insertUser.level || "A1",
      weeklyGoal: 50,
      wordsLearned: 0,
      streak: 0,
      lastActiveDate: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Song methods
  async getSongs(filters?: { genre?: string; difficulty?: string; language?: string }): Promise<Song[]> {
    let songs = Array.from(this.songs.values());
    
    if (filters?.genre) {
      songs = songs.filter(song => song.genre.toLowerCase() === filters.genre?.toLowerCase());
    }
    if (filters?.difficulty) {
      songs = songs.filter(song => song.difficulty === filters.difficulty);
    }
    if (filters?.language) {
      songs = songs.filter(song => song.language === filters.language);
    }
    
    return songs;
  }

  async getSong(id: number): Promise<Song | undefined> {
    return this.songs.get(id);
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = this.currentSongId++;
    const song: Song = { 
      ...insertSong, 
      id,
      duration: insertSong.duration || 0,
      rating: insertSong.rating || 0,
      albumCover: insertSong.albumCover || null,
      audioUrl: insertSong.audioUrl || null
    };
    this.songs.set(id, song);
    return song;
  }

  // User progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(progress => progress.userId === userId);
  }

  async getUserProgressBySong(userId: number, songId: number): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values()).find(
      progress => progress.userId === userId && progress.songId === songId
    );
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = this.currentProgressId++;
    const progress: UserProgress = { 
      ...insertProgress, 
      id,
      progressPercentage: insertProgress.progressPercentage || 0,
      wordsLearned: insertProgress.wordsLearned || 0,
      completedAt: null
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  async updateUserProgress(id: number, updates: Partial<UserProgress>): Promise<UserProgress> {
    const progress = this.userProgress.get(id);
    if (!progress) throw new Error("Progress not found");
    
    const updatedProgress = { ...progress, ...updates };
    this.userProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  // Vocabulary methods
  async getUserVocabulary(userId: number): Promise<Vocabulary[]> {
    return Array.from(this.vocabulary.values()).filter(vocab => vocab.userId === userId);
  }

  async createVocabulary(insertVocabulary: InsertVocabulary): Promise<Vocabulary> {
    const id = this.currentVocabularyId++;
    const vocabulary: Vocabulary = { 
      ...insertVocabulary, 
      id,
      songId: insertVocabulary.songId || null,
      context: insertVocabulary.context || null,
      learnedAt: new Date(),
      reviewCount: 0
    };
    this.vocabulary.set(id, vocabulary);
    return vocabulary;
  }

  async updateVocabulary(id: number, updates: Partial<Vocabulary>): Promise<Vocabulary> {
    const vocabulary = this.vocabulary.get(id);
    if (!vocabulary) throw new Error("Vocabulary not found");
    
    const updatedVocabulary = { ...vocabulary, ...updates };
    this.vocabulary.set(id, updatedVocabulary);
    return updatedVocabulary;
  }
}

export const storage = new MemStorage();
