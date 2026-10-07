import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  FlatList, Modal, Alert, ActivityIndicator, Linking, Platform, Dimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from "../../contexts/DialogContext";
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from '../../config/firebase';
import { uploadToCloudinary, sanitizeCloudinaryPdfUrl } from '../../services/cloudinary';
import * as DocumentPicker from 'expo-document-picker';
// SDK 56: documentDirectory/downloadAsync live in the legacy API entry point.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLayoutInsets } from '../../constants/layout';
import { AppBar, Icon } from '../../components/ui';
import { myRating, rateBook, average, ratingScore } from '../../services/ratings';
import { increment } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BookCover from '../../components/library/BookCover';
import { DOWNLOADS_DIR, listDownloads } from '../../services/downloads';
import { shareFile } from '../../services/shareApp';

const LAST_READ = 'sadhak_last_read';
type LastRead = { id: string; title: string; author: string; url: string; category: string; at: number };

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'bookshelf', color: '#C2410C' },
  { id: 'vedas', name: 'Vedas & Upanishads', icon: 'book-open-page-variant', color: '#FF6B00' },
  { id: 'puranas', name: 'Puranas', icon: 'book-multiple', color: '#8B0000' },
  { id: 'gita', name: 'Bhagavad Gita', icon: 'om', color: '#1565C0' },
  { id: 'epics', name: 'Ramayana & Mahabharata', icon: 'sword-cross', color: '#2D6A4F' },
  { id: 'stotras', name: 'Stotras & Mantras', icon: 'music-note', color: '#9C27B0' },
  { id: 'dharma', name: 'Dharmashastra', icon: 'scale-balance', color: '#D32F2F' },
  { id: 'puja', name: 'Puja Vidhi', icon: 'candle', color: '#FF8C00' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#616161' },
];

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'top' | 'popular' | 'title';

interface LibraryItem {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: any;
  downloadCount: number;
  status?: string;
  ratingSum?: number;
  ratingCount?: number;
}

export default function LibraryScreen() {
  const { user, isAdmin } = useAuth();
  const { colors, isDark, tone } = useTheme();
  const dialog = useDialog();
  const { t, tx, display } = useLanguage();
  const { headerPaddingTop, tabContentPadding, bottomInset } = useLayoutInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<LibraryItem[]>([]);
  const [submissions, setSubmissions] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', author: '', category: 'other', description: '' });
  const [customCat, setCustomCat] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rateFor, setRateFor] = useState<LibraryItem | null>(null);
  const [myStars, setMyStars] = useState(0);
  const [savingRate, setSavingRate] = useState(false);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [offline, setOffline] = useState<{ name: string; uri: string }[]>([]);
  useEffect(() => { listDownloads().then(setOffline); }, []);
  useEffect(() => {
    AsyncStorage.getItem(LAST_READ).then((v) => { if (v) setLastRead(JSON.parse(v)); }).catch(() => {});
  }, []);

  const openRate = async (book: LibraryItem) => {
    if (!user) return;
    setRateFor(book); setMyStars(0);
    setMyStars(await myRating(book.id, user.uid));
  };

  const submitRate = async (stars: number) => {
    if (!user || !rateFor) return;
    setSavingRate(true);
    const prev = await myRating(rateFor.id, user.uid);
    try {
      await rateBook(rateFor.id, user.uid, stars, prev);
      setBooks((list) => list.map((b) => b.id === rateFor.id
        ? { ...b, ratingSum: (b.ratingSum || 0) + stars - prev, ratingCount: (b.ratingCount || 0) + (prev ? 0 : 1) }
        : b));
      setMyStars(stars);
      setTimeout(() => setRateFor(null), 350);
    } catch (e: any) {
      dialog.alert('Could not save rating', String(e?.message || e).slice(0, 200));
    } finally { setSavingRate(false); }
  };

  const Stars = ({ book, size = 12 }: { book: LibraryItem; size?: number }) => {
    const avg = average(book.ratingSum, book.ratingCount);
    return (
      <TouchableOpacity onPress={() => openRate(book)} hitSlop={8} style={st.starsRow} accessibilityLabel={tx('Rate this book')}>
        <MaterialCommunityIcons name={avg ? 'star' : 'star-outline'} size={size + 2} color="#E8A317" />
        <Text style={[st.starsText, { color: avg ? colors.text : colors.textTertiary }]}>
          {avg ? `${avg.toFixed(1)}` : tx('Rate')}
        </Text>
        {!!book.ratingCount && <Text style={[st.starsCount, { color: colors.textTertiary }]}>({book.ratingCount})</Text>}
      </TouchableOpacity>
    );
  };

  useEffect(() => { fetchBooks(); if (isAdmin) fetchSubmissions(); }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'library'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      setBooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryItem)));
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchSubmissions = async () => {
    try {
      const q = query(collection(db, 'library_submissions'), where('status', '==', 'pending_review'));
      const snapshot = await getDocs(q);
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryItem)));
    } catch (e) { console.error(e); }
  };

  const approveSubmission = async (item: LibraryItem) => {
    try {
      await addDoc(collection(db, 'library'), {
        title: item.title, author: item.author, category: item.category,
        description: item.description, cloudinaryUrl: item.cloudinaryUrl,
        cloudinaryPublicId: item.cloudinaryPublicId, fileSize: item.fileSize,
        uploadedBy: item.uploadedBy, uploadedAt: serverTimestamp(), downloadCount: 0,
      });
      await deleteDoc(doc(db, 'library_submissions', item.id));
      dialog.alert('Approved', `"${item.title}" published to library.`);
      fetchBooks();
      fetchSubmissions();
    } catch (e) { dialog.alert('Error', 'Could not approve.'); }
  };

  const rejectSubmission = async (item: LibraryItem) => {
    dialog.alert('Reject Submission', `Reject "${item.title}"?`, [
      { text: 'Cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'library_submissions', item.id));
        dialog.alert('Rejected', 'Submission removed.');
        fetchSubmissions();
      }},
    ]);
  };

  const filteredBooks = books
    .filter(book => {
      const matchCategory = selectedCategory === 'all' || book.category === selectedCategory;
      const matchSearch = !searchQuery || book.title.toLowerCase().includes(searchQuery.toLowerCase()) || book.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortMode === 'popular') return (b.downloadCount || 0) - (a.downloadCount || 0);
      if (sortMode === 'top') return ratingScore(b.ratingSum, b.ratingCount) - ratingScore(a.ratingSum, a.ratingCount);
      return 0; // newest is already the default order
    });

  const browsing = !searchQuery && selectedCategory === 'all';

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) setSelectedFile(result.assets[0]);
    } catch (error) { dialog.alert('Error', 'Could not pick document'); }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.title.trim()) {
      dialog.alert('Error', 'Please select a PDF and enter a title');
      return;
    }
    if (uploadData.category === 'custom' && !customCat.trim()) {
      dialog.alert('Error', 'Enter a name for your custom category.');
      return;
    }
    // A custom category stores the typed label directly; presets store their id.
    const finalCategory = uploadData.category === 'custom' ? customCat.trim() : uploadData.category;
    try {
      setUploading(true);
      const cloudResult = await uploadToCloudinary(selectedFile.uri, 'sadhak/library', 'raw');

      // Preflight: verify the Cloudinary URL is publicly reachable BEFORE saving
      // to Firestore. Cloudinary accounts that haven't enabled PDF delivery
      // return 401 here — surface it now so we never publish a book that will
      // 401 for every reader downstream.
      const preflightUrl = sanitizeCloudinaryPdfUrl(cloudResult.secure_url);
      try {
        const head = await fetch(preflightUrl, { method: 'HEAD' });
        if (head.status === 401 || head.status === 403) {
          throw new Error(
            'Cloudinary is blocking PDF delivery for this account (HTTP ' + head.status +
            '). Enable it once in your Cloudinary dashboard → Settings → Security → allow delivery of PDF and ZIP files, then upload again.',
          );
        }
      } catch (e: any) {
        // Network failure during preflight is not fatal — keep publishing and
        // let the reader handle it. Only auth failures abort.
        if (/401|403|blocking PDF/i.test(String(e?.message))) throw e;
      }

      const collectionName = isAdmin ? 'library' : 'library_submissions';
      await addDoc(collection(db, collectionName), {
        title: uploadData.title.trim(), author: uploadData.author.trim() || 'Unknown',
        category: finalCategory, description: uploadData.description.trim(),
        cloudinaryUrl: preflightUrl, cloudinaryPublicId: cloudResult.public_id,
        fileSize: cloudResult.bytes, uploadedBy: user?.uid, uploadedAt: serverTimestamp(),
        downloadCount: 0, ...(isAdmin ? {} : { status: 'pending_review' }),
      });
      dialog.alert('Success', isAdmin ? 'PDF published to library!' : 'PDF submitted for review.');
      setUploadModal(false);
      setSelectedFile(null);
      setUploadData({ title: '', author: '', category: 'other', description: '' });
      setCustomCat('');
      if (isAdmin) fetchBooks();
    } catch (error: any) {
      // Show the REAL reason (Cloudinary message / network detail) so failures
      // are debuggable from a screenshot instead of a generic guess.
      dialog.alert('Upload Failed', String(error?.message || error).slice(0, 300));
    } finally { setUploading(false); }
  };

  // Read inside the app (pdf.js reader) instead of kicking users to an external app.
  const openPDF = (url: string, title?: string) =>
    router.push({ pathname: '/reader', params: { url, title: title || '' } });
  const openBook = (book: LibraryItem) => {
    const lr: LastRead = { id: book.id, title: book.title, author: book.author, url: book.cloudinaryUrl, category: book.category, at: Date.now() };
    setLastRead(lr);
    AsyncStorage.setItem(LAST_READ, JSON.stringify(lr)).catch(() => {});
    openPDF(book.cloudinaryUrl, book.title);
  };

  // Preset categories resolve to their entry; a custom category (any string not
  // in CATEGORIES) keeps its own label with a plain book glyph.
  const catOf = (category: string) => {
    const preset = CATEGORIES.find(c => c.id === category);
    const other = CATEGORIES[CATEGORIES.length - 1];
    return preset || { ...other, name: category || other.name, icon: 'book-outline' };
  };

  const downloadPDF = async (book: LibraryItem) => {
    try {
      setDownloadingId(book.id);
      const fileName = `${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true }).catch(() => {});
      const fileUri = DOWNLOADS_DIR + fileName;
      const download = await FileSystem.downloadAsync(book.cloudinaryUrl, fileUri);
      if (download.status !== 200) throw new Error(`Server replied HTTP ${download.status}.`);
      try { await updateDoc(doc(db, 'library', book.id), { downloadCount: increment(1) }); } catch (e) {}
      setOffline(await listDownloads());
      dialog.alert(tx('Saved offline'), `"${book.title}"`, [
        { text: tx('Read now'), onPress: () => openPDF(download.uri, book.title) },
        { text: tx('Share'), onPress: () => shareFile(download.uri, 'application/pdf', `"${book.title}" from the Sadhak library`) },
        { text: tx('Done'), style: 'cancel' },
      ], { tone: 'success' });
    } catch (error: any) {
      // Real reason instead of a generic guess — debuggable from a screenshot.
      dialog.alert('Download failed', String(error?.message || error).slice(0, 200));
    } finally { setDownloadingId(null); }
  };

  // Admin: remove a published book (long-press a card).
  const deleteBook = (book: LibraryItem) => {
    if (!isAdmin) return;
    dialog.alert('Delete book?', `Remove "${book.title}" from the library? This cannot be undone.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'library', book.id));
          setBooks((prev) => prev.filter((b) => b.id !== book.id));
          dialog.alert('Deleted', `"${book.title}" was removed.`);
        } catch (e: any) {
          dialog.alert('Error', 'Could not delete the book.');
        }
      }},
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderBookCard = ({ item }: { item: LibraryItem }) => {
    const cat = catOf(item.category);
    const isDownloading = downloadingId === item.id;

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity style={[st.gridCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => openBook(item)} onLongPress={() => deleteBook(item)} activeOpacity={0.7}>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <BookCover title={item.title} color={cat.color} icon={cat.icon} width={GRID_W - 56} />
          </View>
          <Text style={[st.gridTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[st.gridAuthor, { color: colors.textSecondary }]} numberOfLines={1}>{item.author}</Text>
          <View style={st.gridMeta}>
            <Stars book={item} />
            <TouchableOpacity onPress={() => downloadPDF(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isDownloading ? <ActivityIndicator size="small" color={colors.primary} /> :
                <MaterialCommunityIcons name="download" size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={[st.bookCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => openBook(item)} onLongPress={() => deleteBook(item)} activeOpacity={0.7}>
        <BookCover title={item.title} color={cat.color} icon={cat.icon} width={50} />
        <View style={st.bookInfo}>
          <Text style={[st.bookTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[st.bookAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
          {item.description ? <Text style={[st.bookDesc, { color: colors.textTertiary }]} numberOfLines={1}>{item.description}</Text> : null}
          <View style={st.bookMeta}>
            <Stars book={item} />
            {(item.downloadCount || 0) > 0 && (
              <View style={st.downloadBadge}>
                <MaterialCommunityIcons name="download" size={10} color={colors.textTertiary} />
                <Text style={[st.downloadCount, { color: colors.textTertiary }]}>{item.downloadCount}</Text>
              </View>
            )}
            <Text style={[st.bookCategory, { color: tone(cat.color).fg, backgroundColor: tone(cat.color).bg }]}>{tx(cat.name)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[st.dlBtn, { backgroundColor: colors.primary + '12' }]} onPress={() => downloadPDF(item)}>
          {isDownloading ? <ActivityIndicator size="small" color={colors.primary} /> :
            <MaterialCommunityIcons name="download" size={22} color={colors.primary} />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: headerPaddingTop + 4 }]}>
        <AppBar
          title={t('f.library')}
          subtitle={`${books.length} · ${t('lib.sub')}`}
          right={
            <>
              {isAdmin && submissions.length > 0 && (
                <TouchableOpacity style={[st.reviewBadge, { backgroundColor: '#EF444418' }]} onPress={() => setShowReviewQueue(true)}>
                  <MaterialCommunityIcons name="file-clock-outline" size={18} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>{submissions.length}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={[st.headerBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                <Icon name={viewMode === 'grid' ? 'list-bullets' : 'squares-four'} size={19} color={colors.text} weight="regular" />
              </TouchableOpacity>
            </>
          }
        />
      </View>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="magnifying-glass" size={18} color={colors.textTertiary} weight="regular" />
        <TextInput style={[st.searchInput, { color: colors.text }]} placeholder={t('lib.search')} placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      {/* Books */}
      {loading ? (
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{tx('Loading library...')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          renderItem={renderBookCard}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[viewMode === 'grid' ? st.gridList : st.booksList, { paddingBottom: tabContentPadding + 70 }]}
          columnWrapperStyle={viewMode === 'grid' ? { gap: 10 } : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {browsing ? (
                <>
                  {lastRead && (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => openPDF(lastRead.url, lastRead.title)} style={[st.continue, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <BookCover title={lastRead.title} color={catOf(lastRead.category).color} icon={catOf(lastRead.category).icon} width={46} />
                      <View style={{ flex: 1 }}>
                        <Text style={[st.kicker, { color: colors.primary }]}>{tx('Continue reading').toUpperCase()}</Text>
                        <Text style={[st.bookTitle, { color: colors.text }]} numberOfLines={1}>{lastRead.title}</Text>
                        <Text style={[st.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>{lastRead.author}</Text>
                      </View>
                      <View style={[st.playBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="book-outline" size={18} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {offline.length > 0 && (
                    <>
                      <Text style={[st.section, { color: colors.text }, display]}>{tx('Downloaded')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
                        {offline.map((f) => (
                          <TouchableOpacity key={f.uri} onPress={() => openPDF(f.uri, f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '))} style={[st.offline, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="file-pdf-box" size={22} color={colors.primary} />
                            <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '700', maxWidth: 140 }} numberOfLines={2}>{f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  <Text style={[st.section, { color: colors.text }, display]}>{tx('Browse by category')}</Text>
                  <View style={st.catGrid}>
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                      const n = books.filter((b) => b.category === cat.id).length;
                      return (
                        <TouchableOpacity key={cat.id} style={[st.catTile, { backgroundColor: tone(cat.color).bg }]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8}>
                          <MaterialCommunityIcons name={cat.icon as any} size={24} color={tone(cat.color).fg} />
                          <Text style={[st.catTileName, { color: colors.text }]} numberOfLines={2}>{tx(cat.name)}</Text>
                          <Text style={[st.catTileCount, { color: tone(cat.color).fg }]}>{n}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {[
                    { key: 'top', title: tx('Top rated'), list: books.filter((b) => b.ratingCount).sort((a, b) => ratingScore(b.ratingSum, b.ratingCount) - ratingScore(a.ratingSum, a.ratingCount)).slice(0, 10) },
                    { key: 'new', title: tx('New arrivals'), list: books.slice(0, 10) },
                  ].filter((sh) => sh.list.length >= 2).map((sh) => (
                    <View key={sh.key}>
                      <Text style={[st.section, { color: colors.text }, display]}>{sh.title}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
                        {sh.list.map((b) => {
                          const c = catOf(b.category);
                          return (
                            <TouchableOpacity key={b.id} style={{ width: 104 }} onPress={() => openBook(b)} activeOpacity={0.8}>
                              <BookCover title={b.title} color={c.color} icon={c.icon} width={104} />
                              <Text style={[st.shelfTitle, { color: colors.text }]} numberOfLines={2}>{b.title}</Text>
                              <Stars book={b} size={11} />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                  <Text style={[st.section, { color: colors.text }, display]}>{tx('All books')}</Text>
                </>
              ) : (
                <View style={st.filterHead}>
                  {selectedCategory !== 'all' && (
                    <TouchableOpacity onPress={() => setSelectedCategory('all')} style={[st.backChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Ionicons name="chevron-back" size={15} color={colors.text} />
                      <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '700' }}>{tx('All')}</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[st.filterTitle, { color: colors.text }, display]} numberOfLines={1}>
                    {selectedCategory !== 'all' ? tx(catOf(selectedCategory).name) : tx('Results')}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{filteredBooks.length}</Text>
                </View>
              )}
              {books.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20, marginBottom: 10, flexGrow: 0 }}>
                  {([
                    { mode: 'newest' as SortMode, label: 'Newest', icon: 'clock-outline' },
                    { mode: 'top' as SortMode, label: 'Top rated', icon: 'star' },
                    { mode: 'popular' as SortMode, label: 'Popular', icon: 'fire' },
                    { mode: 'title' as SortMode, label: 'A-Z', icon: 'sort-alphabetical-ascending' },
                  ]).map(({ mode, label, icon }) => {
                    const active = sortMode === mode;
                    return (
                      <TouchableOpacity key={mode} style={[st.sortChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]} onPress={() => setSortMode(mode)}>
                        <MaterialCommunityIcons name={icon as any} size={14} color={active ? '#FFF' : colors.textSecondary} />
                        <Text style={[st.sortText, { color: active ? '#FFF' : colors.textSecondary }]}>{tx(label)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={st.emptyState}>
              <MaterialCommunityIcons name="book-open-blank-variant" size={48} color={colors.textTertiary} />
              <Text style={[st.emptyTitle, { color: colors.text }]}>
                {tx(searchQuery ? 'No Results' : browsing ? 'Library is Empty' : 'Nothing here yet')}
              </Text>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? `${tx('No books match')} "${searchQuery}"` : tx('Upload a PDF to get started')}
              </Text>
            </View>
          }
        />
      )}

      {/* Upload FAB — sits above the floating tab bar */}
      <TouchableOpacity style={[st.fab, { bottom: 20 }]} onPress={() => setUploadModal(true)} activeOpacity={0.8}>
        <LinearGradient colors={['#C2410C', '#E8743B']} style={st.fabGrad}>
          <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Rating sheet */}
      <Modal visible={!!rateFor} transparent animationType="fade" onRequestClose={() => setRateFor(null)} statusBarTranslucent navigationBarTranslucent>
        <TouchableOpacity style={st.rateOverlay} activeOpacity={1} onPress={() => setRateFor(null)}>
          <View style={[st.rateCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.rateTitle, { color: colors.text }]} numberOfLines={2}>{rateFor?.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              {rateFor && rateFor.ratingCount ? `${average(rateFor.ratingSum, rateFor.ratingCount).toFixed(1)} ★ · ${rateFor.ratingCount} ${tx('ratings')}` : tx('Be the first to rate this book.')}
            </Text>
            <View style={st.rateStars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => submitRate(n)} disabled={savingRate} hitSlop={6} accessibilityLabel={`${n}`}>
                  <MaterialCommunityIcons name={n <= myStars ? 'star' : 'star-outline'} size={40} color="#E8A317" />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 12.5 }}>{savingRate ? tx('Saving…') : myStars ? tx('Your rating. Tap to change.') : tx('Tap a star to rate.')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={uploadModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.surface, paddingBottom: 24 + bottomInset }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{isAdmin ? 'Upload PDF' : 'Submit PDF for Review'}</Text>
              <TouchableOpacity onPress={() => setUploadModal(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Upload status indicator */}
            {uploading && (
              <View style={[st.uploadStatus, { backgroundColor: colors.primary + '10' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{tx('Uploading...')}</Text>
              </View>
            )}

            <TouchableOpacity style={[st.filePicker, { borderColor: selectedFile ? colors.primary : colors.border }]} onPress={pickDocument}>
              <MaterialCommunityIcons name={selectedFile ? 'file-pdf-box' : 'cloud-upload-outline'} size={36} color={selectedFile ? colors.primary : colors.textTertiary} />
              <Text style={[st.filePickerTitle, { color: selectedFile ? colors.text : colors.textTertiary }]}>{selectedFile ? selectedFile.name : 'Tap to select PDF'}</Text>
              {selectedFile && <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{formatFileSize(selectedFile.size || 0)}</Text>}
            </TouchableOpacity>

            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder={tx('Book Title *')} placeholderTextColor={colors.textTertiary} value={uploadData.title} onChangeText={t => setUploadData({ ...uploadData, title: t })} />
            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder={tx('Author')} placeholderTextColor={colors.textTertiary} value={uploadData.author} onChangeText={t => setUploadData({ ...uploadData, author: t })} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <TouchableOpacity key={cat.id} style={[st.catSelect, { backgroundColor: uploadData.category === cat.id ? cat.color : colors.background, borderColor: cat.color }]} onPress={() => { setCustomCat(''); setUploadData({ ...uploadData, category: cat.id }); }}>
                  <Text style={[st.catSelectText, { color: uploadData.category === cat.id ? '#FFF' : cat.color }]}>{tx(cat.name)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[st.catSelect, { backgroundColor: customCat.trim() ? colors.primary : colors.background, borderColor: colors.primary }]} onPress={() => setUploadData({ ...uploadData, category: 'custom' })}>
                <MaterialCommunityIcons name="plus" size={13} color={customCat.trim() ? '#FFF' : colors.primary} />
                <Text style={[st.catSelectText, { color: customCat.trim() ? '#FFF' : colors.primary }]}>{tx('Custom')}</Text>
              </TouchableOpacity>
            </ScrollView>

            {uploadData.category === 'custom' && (
              <TextInput
                style={[st.modalInput, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.background }]}
                placeholder={tx('Custom category name (e.g. Sant Sahitya)')}
                placeholderTextColor={colors.textTertiary}
                value={customCat}
                onChangeText={setCustomCat}
                maxLength={40}
              />
            )}

            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, height: 80, textAlignVertical: 'top' }]} placeholder={tx('Description (optional)')} placeholderTextColor={colors.textTertiary} value={uploadData.description} onChangeText={t => setUploadData({ ...uploadData, description: t })} multiline numberOfLines={3} />

            <TouchableOpacity onPress={handleUpload} disabled={uploading} activeOpacity={0.8}>
              <LinearGradient colors={isAdmin ? ['#C2410C', '#E8743B'] : ['#2D6A4F', '#4CAF50']} style={st.uploadBtn}>
                {uploading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name={isAdmin ? 'upload' : 'send-check'} size={20} color="#FFF" />
                    <Text style={st.uploadBtnText}>{isAdmin ? 'Publish' : 'Submit for Review'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin Review Queue Modal */}
      <Modal visible={showReviewQueue} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{tx('Review Queue (')}{submissions.length})</Text>
              <TouchableOpacity onPress={() => setShowReviewQueue(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {submissions.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <MaterialCommunityIcons name="check-decagram" size={48} color="#4ADE80" />
                  <Text style={[st.emptyTitle, { color: colors.text, marginTop: 12 }]}>{tx('All clear!')}</Text>
                  <Text style={{ color: colors.textSecondary }}>{tx('No pending submissions')}</Text>
                </View>
              ) : submissions.map(item => (
                <View key={item.id} style={[st.reviewCard, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.bookTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.author} • {formatFileSize(item.fileSize)}</Text>
                    {item.description ? <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }} numberOfLines={2}>{item.description}</Text> : null}
                  </View>
                  <View style={st.reviewActions}>
                    <TouchableOpacity style={[st.reviewBtn, { backgroundColor: '#4ADE8020' }]} onPress={() => approveSubmission(item)}>
                      <MaterialCommunityIcons name="check" size={20} color="#4ADE80" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.reviewBtn, { backgroundColor: '#EF444420' }]} onPress={() => rejectSubmission(item)}>
                      <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const GRID_W = (Dimensions.get('window').width - 48 - 10) / 2;

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 6, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  reviewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, paddingHorizontal: 14, height: 44, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsText: { fontSize: 12, fontWeight: '800' },
  starsCount: { fontSize: 11 },
  rateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 },
  rateCard: { borderRadius: 24, borderWidth: 1, padding: 22, alignItems: 'center' },
  rateTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  rateStars: { flexDirection: 'row', gap: 6, marginVertical: 18 },
  continue: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, marginTop: 4 },
  kicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  playBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTile: { width: '22%', flexGrow: 1, borderRadius: 14, padding: 10, minHeight: 96, gap: 6 },
  catTileName: { fontSize: 11.5, fontWeight: '700', lineHeight: 15 },
  catTileCount: { fontSize: 11, fontWeight: '800', marginTop: 'auto' },
  shelfTitle: { fontSize: 12.5, fontWeight: '700', marginTop: 8, marginBottom: 2, lineHeight: 16 },
  filterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 10 },
  backChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, height: 32, borderRadius: 16, borderWidth: 1 },
  filterTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  sortText: { fontSize: 12, fontWeight: '600' },

  // flexGrow:0 + capped height — without it the horizontal ScrollView stretches
  // in the flex column and the category chips render as giant full-height cards.
  catScroll: { flexGrow: 0, flexShrink: 0, height: 52 },
  catRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1, gap: 5 },
  catText: { fontSize: 11, fontWeight: '600' },

  // List view
  booksList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 8 },
  bookCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  bookIcon: { width: 52, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  bookAuthor: { fontSize: 12, marginTop: 2 },
  bookDesc: { fontSize: 11, marginTop: 2 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  bookSize: { fontSize: 11 },
  downloadBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  downloadCount: { fontSize: 10 },
  bookCategory: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  dlBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Grid view
  gridList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 10 },
  gridCard: { width: GRID_W, borderRadius: 16, padding: 14, borderWidth: 1 },
  gridIcon: { width: '100%' as any, height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  gridTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  gridAuthor: { fontSize: 11, marginTop: 2 },
  gridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  gridSize: { fontSize: 10 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },

  fab: { position: 'absolute', bottom: 90, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  uploadStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 12 },
  filePicker: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 20, alignItems: 'center', gap: 6, marginBottom: 14 },
  filePickerTitle: { fontSize: 14, fontWeight: '600' },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  catSelect: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, marginRight: 6 },
  catSelectText: { fontSize: 11, fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 52 },
  uploadBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Review queue
  reviewCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 10 },
  reviewActions: { gap: 6 },
  reviewBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
