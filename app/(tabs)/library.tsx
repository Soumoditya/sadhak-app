import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  FlatList, Modal, Alert, ActivityIndicator, Linking, Platform, Dimensions,
} from 'react-native';
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

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'bookshelf', color: '#D94F00' },
  { id: 'vedas', name: 'Vedas & Upanishads', icon: 'book-open-page-variant', color: '#FF6B00' },
  { id: 'puranas', name: 'Puranas', icon: 'book-multiple', color: '#8B0000' },
  { id: 'gita', name: 'Bhagavad Gita', icon: 'book-cross', color: '#1565C0' },
  { id: 'epics', name: 'Ramayana & Mahabharata', icon: 'sword-cross', color: '#2D6A4F' },
  { id: 'stotras', name: 'Stotras & Mantras', icon: 'music-note', color: '#9C27B0' },
  { id: 'dharma', name: 'Dharmashastra', icon: 'scale-balance', color: '#D32F2F' },
  { id: 'puja', name: 'Puja Vidhi', icon: 'candle', color: '#FF8C00' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#616161' },
];

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'title' | 'popular';

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
}

export default function LibraryScreen() {
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t } = useLanguage();
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
      return 0; // newest is already the default order
    });

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

  const downloadPDF = async (book: LibraryItem) => {
    try {
      setDownloadingId(book.id);
      const fileName = `${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      const download = await FileSystem.downloadAsync(book.cloudinaryUrl, fileUri);
      if (download.status !== 200) throw new Error(`Server replied HTTP ${download.status}.`);
      try { await updateDoc(doc(db, 'library', book.id), { downloadCount: (book.downloadCount || 0) + 1 }); } catch (e) {}
      dialog.alert('Downloaded', `"${book.title}" is saved offline. What next?`, [
        { text: 'Read now', onPress: () => openPDF(download.uri, book.title) },
        { text: 'Share / save', onPress: async () => { try { await Sharing.shareAsync(download.uri); } catch {} } },
        { text: 'Done', style: 'cancel' },
      ]);
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
    // Preset categories resolve to their chip; a custom category (any string not
    // in CATEGORIES) keeps its own label but shows a proper book glyph (not the
    // "···" dots that read as an unfinished placeholder).
    const preset = CATEGORIES.find(c => c.id === item.category);
    const other = CATEGORIES[CATEGORIES.length - 1];
    const cat = preset || { ...other, name: item.category || other.name, icon: 'book-outline' };
    const isDownloading = downloadingId === item.id;

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity style={[st.gridCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => openPDF(item.cloudinaryUrl, item.title)} onLongPress={() => deleteBook(item)} activeOpacity={0.7}>
          <View style={[st.gridIcon, { backgroundColor: cat.color + '12' }]}>
            <MaterialCommunityIcons name={cat.icon as any} size={32} color={cat.color} />
          </View>
          <Text style={[st.gridTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[st.gridAuthor, { color: colors.textSecondary }]} numberOfLines={1}>{item.author}</Text>
          <View style={st.gridMeta}>
            <Text style={[st.gridSize, { color: colors.textTertiary }]}>{formatFileSize(item.fileSize)}</Text>
            <TouchableOpacity onPress={() => downloadPDF(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isDownloading ? <ActivityIndicator size="small" color={colors.primary} /> :
                <MaterialCommunityIcons name="download" size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={[st.bookCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => openPDF(item.cloudinaryUrl, item.title)} onLongPress={() => deleteBook(item)} activeOpacity={0.7}>
        <View style={[st.bookIcon, { backgroundColor: cat.color + '12' }]}>
          <MaterialCommunityIcons name={cat.icon as any} size={28} color={cat.color} />
        </View>
        <View style={st.bookInfo}>
          <Text style={[st.bookTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[st.bookAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
          {item.description ? <Text style={[st.bookDesc, { color: colors.textTertiary }]} numberOfLines={1}>{item.description}</Text> : null}
          <View style={st.bookMeta}>
            <Text style={[st.bookSize, { color: colors.textTertiary }]}>{formatFileSize(item.fileSize)}</Text>
            {(item.downloadCount || 0) > 0 && (
              <View style={st.downloadBadge}>
                <MaterialCommunityIcons name="download" size={10} color={colors.textTertiary} />
                <Text style={[st.downloadCount, { color: colors.textTertiary }]}>{item.downloadCount}</Text>
              </View>
            )}
            <Text style={[st.bookCategory, { color: cat.color, backgroundColor: cat.color + '10' }]}>{cat.name}</Text>
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
      <LinearGradient colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#B33D00']} style={[st.header, { paddingTop: headerPaddingTop }]}>
        <View style={st.headerRow}>
          <View>
            <Text style={st.headerTitle}>{t('lib.title')}</Text>
            <Text style={st.headerSub}>{books.length} texts available</Text>
          </View>
          <View style={st.headerActions}>
            {isAdmin && submissions.length > 0 && (
              <TouchableOpacity style={[st.reviewBadge, { backgroundColor: '#EF444420' }]} onPress={() => setShowReviewQueue(true)}>
                <MaterialCommunityIcons name="file-clock-outline" size={18} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>{submissions.length}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/wiki')} style={st.headerBtn}>
              <MaterialCommunityIcons name="book-education-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={st.headerBtn}>
              <MaterialCommunityIcons name={viewMode === 'grid' ? 'view-list-outline' : 'view-grid-outline'} size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput style={[st.searchInput, { color: colors.text }]} placeholder="Search books, authors..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      {/* Sort */}
      <View style={st.sortRow}>
        {([
          { mode: 'newest' as SortMode, label: 'Newest', icon: 'clock-outline' },
          { mode: 'title' as SortMode, label: 'A-Z', icon: 'sort-alphabetical-ascending' },
          { mode: 'popular' as SortMode, label: 'Popular', icon: 'fire' },
        ]).map(({ mode, label, icon }) => {
          const active = sortMode === mode;
          return (
            <TouchableOpacity key={mode} style={[st.sortChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]} onPress={() => setSortMode(mode)}>
              <MaterialCommunityIcons name={icon as any} size={14} color={active ? '#FFF' : colors.textSecondary} />
              <Text style={[st.sortText, { color: active ? '#FFF' : colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catScroll} contentContainerStyle={st.catRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id}
            style={[st.catChip, { backgroundColor: selectedCategory === cat.id ? cat.color : colors.surface, borderColor: selectedCategory === cat.id ? cat.color : colors.border }]}
            onPress={() => setSelectedCategory(cat.id)}>
            <MaterialCommunityIcons name={cat.icon as any} size={14} color={selectedCategory === cat.id ? '#FFF' : cat.color} />
            <Text style={[st.catText, { color: selectedCategory === cat.id ? '#FFF' : colors.text }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Books */}
      {loading ? (
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Loading library...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          renderItem={renderBookCard}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[viewMode === 'grid' ? st.gridList : st.booksList, { paddingBottom: tabContentPadding }]}
          columnWrapperStyle={viewMode === 'grid' ? { gap: 10 } : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={st.emptyState}>
              <MaterialCommunityIcons name="book-open-blank-variant" size={60} color={colors.textTertiary} />
              <Text style={[st.emptyTitle, { color: colors.text }]}>
                {searchQuery ? 'No Results' : 'Library is Empty'}
              </Text>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? `No books matching "${searchQuery}"` : 'Upload a PDF to get started'}
              </Text>
            </View>
          }
        />
      )}

      {/* Upload FAB — sits above the floating tab bar */}
      <TouchableOpacity style={[st.fab, { bottom: tabContentPadding }]} onPress={() => setUploadModal(true)} activeOpacity={0.8}>
        <LinearGradient colors={['#D94F00', '#FF8C00']} style={st.fabGrad}>
          <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={uploadModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
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
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Uploading...</Text>
              </View>
            )}

            <TouchableOpacity style={[st.filePicker, { borderColor: selectedFile ? colors.primary : colors.border }]} onPress={pickDocument}>
              <MaterialCommunityIcons name={selectedFile ? 'file-pdf-box' : 'cloud-upload-outline'} size={36} color={selectedFile ? colors.primary : colors.textTertiary} />
              <Text style={[st.filePickerTitle, { color: selectedFile ? colors.text : colors.textTertiary }]}>{selectedFile ? selectedFile.name : 'Tap to select PDF'}</Text>
              {selectedFile && <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{formatFileSize(selectedFile.size || 0)}</Text>}
            </TouchableOpacity>

            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Book Title *" placeholderTextColor={colors.textTertiary} value={uploadData.title} onChangeText={t => setUploadData({ ...uploadData, title: t })} />
            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Author" placeholderTextColor={colors.textTertiary} value={uploadData.author} onChangeText={t => setUploadData({ ...uploadData, author: t })} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <TouchableOpacity key={cat.id} style={[st.catSelect, { backgroundColor: uploadData.category === cat.id ? cat.color : colors.background, borderColor: cat.color }]} onPress={() => { setCustomCat(''); setUploadData({ ...uploadData, category: cat.id }); }}>
                  <Text style={[st.catSelectText, { color: uploadData.category === cat.id ? '#FFF' : cat.color }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[st.catSelect, { backgroundColor: customCat.trim() ? colors.primary : colors.background, borderColor: colors.primary }]} onPress={() => setUploadData({ ...uploadData, category: 'custom' })}>
                <MaterialCommunityIcons name="plus" size={13} color={customCat.trim() ? '#FFF' : colors.primary} />
                <Text style={[st.catSelectText, { color: customCat.trim() ? '#FFF' : colors.primary }]}>Custom</Text>
              </TouchableOpacity>
            </ScrollView>

            {uploadData.category === 'custom' && (
              <TextInput
                style={[st.modalInput, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.background }]}
                placeholder="Custom category name (e.g. Sant Sahitya)"
                placeholderTextColor={colors.textTertiary}
                value={customCat}
                onChangeText={setCustomCat}
                maxLength={40}
              />
            )}

            <TextInput style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, height: 80, textAlignVertical: 'top' }]} placeholder="Description (optional)" placeholderTextColor={colors.textTertiary} value={uploadData.description} onChangeText={t => setUploadData({ ...uploadData, description: t })} multiline numberOfLines={3} />

            <TouchableOpacity onPress={handleUpload} disabled={uploading} activeOpacity={0.8}>
              <LinearGradient colors={isAdmin ? ['#D94F00', '#FF8C00'] : ['#2D6A4F', '#4CAF50']} style={st.uploadBtn}>
                {uploading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name={isAdmin ? 'upload' : 'send-check'} size={20} color="#FFF" />
                    <Text style={st.uploadBtnText}>{isAdmin ? 'Publish' : 'Submit for Review'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin Review Queue Modal */}
      <Modal visible={showReviewQueue} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Review Queue ({submissions.length})</Text>
              <TouchableOpacity onPress={() => setShowReviewQueue(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {submissions.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <MaterialCommunityIcons name="check-decagram" size={48} color="#4ADE80" />
                  <Text style={[st.emptyTitle, { color: colors.text, marginTop: 12 }]}>All clear!</Text>
                  <Text style={{ color: colors.textSecondary }}>No pending submissions</Text>
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
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  reviewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, paddingHorizontal: 14, height: 44, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  sortRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 6 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  sortText: { fontSize: 12, fontWeight: '600' },

  // flexGrow:0 + capped height — without it the horizontal ScrollView stretches
  // in the flex column and the category chips render as giant full-height cards.
  catScroll: { flexGrow: 0, maxHeight: 50 },
  catRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1, gap: 5 },
  catText: { fontSize: 11, fontWeight: '600' },

  // List view
  booksList: { paddingHorizontal: 16, paddingBottom: 100, gap: 8 },
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
  gridList: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
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
  fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#D94F00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

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
