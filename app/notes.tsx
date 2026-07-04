import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Modal, Alert, Dimensions, Platform, Animated, KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from '../config/firebase';

const { width: SCREEN_W } = Dimensions.get('window');

const NOTE_COLORS = [
  { id: 'default', color: 'transparent', dark: 'transparent', label: 'Default' },
  { id: 'saffron', color: '#FFF3E0', dark: '#3E2723', label: 'Saffron' },
  { id: 'rose', color: '#FCE4EC', dark: '#3E1929', label: 'Rose' },
  { id: 'sage', color: '#E8F5E9', dark: '#1B3A1F', label: 'Sage' },
  { id: 'sky', color: '#E3F2FD', dark: '#1A2A3D', label: 'Sky' },
  { id: 'lavender', color: '#EDE7F6', dark: '#2D1B4E', label: 'Lavender' },
  { id: 'gold', color: '#FFF8E1', dark: '#3E3514', label: 'Gold' },
  { id: 'coral', color: '#FBE9E7', dark: '#3E2420', label: 'Coral' },
];

const TEXT_COLORS = ['default', '#D94F00', '#DC2626', '#2D6A4F', '#1565C0', '#7C3AED', '#9C27B0', '#F59E0B'];
const HIGHLIGHT_COLORS = ['transparent', '#FFEB3B80', '#A5D6A780', '#81D4FA80', '#CE93D880', '#FFCC8080'];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28];

const FOLDERS = ['All', 'Personal', 'Spiritual', 'Puja', 'Mantra', 'Study', 'Health', 'Family', 'Work', 'Archive', 'Trash'];

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  colorId: string;
  pinned: boolean;
  labels: string[];
  isChecklist: boolean;
  checklist: ChecklistItem[];
  folder: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  createdAt: any;
  updatedAt: any;
}

// ─── Undo/Redo Manager ─────────────────────────────────────────────
function useUndoRedo(initial: string) {
  const [stack, setStack] = useState([initial]);
  const [pointer, setPointer] = useState(0);

  const pushState = (val: string) => {
    const newStack = stack.slice(0, pointer + 1);
    newStack.push(val);
    if (newStack.length > 50) newStack.shift();
    setStack(newStack);
    setPointer(newStack.length - 1);
  };

  const undo = () => {
    if (pointer > 0) { setPointer(pointer - 1); return stack[pointer - 1]; }
    return stack[pointer];
  };

  const redo = () => {
    if (pointer < stack.length - 1) { setPointer(pointer + 1); return stack[pointer + 1]; }
    return stack[pointer];
  };

  return { current: stack[pointer], pushState, undo, redo, canUndo: pointer > 0, canRedo: pointer < stack.length - 1 };
}

export default function NotesScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('default');
  const [pinned, setPinned] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [activeFolder, setActiveFolder] = useState('All');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  // Formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('default');
  const [highlightColor, setHighlightColor] = useState('transparent');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const undoRedo = useUndoRedo('');

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, `users/${user.uid}/notes`), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
    } catch (e) { console.error(e); }
  };

  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setSelectedColor(note.colorId || 'default');
      setPinned(note.pinned || false);
      setSelectedLabels(note.labels || []);
      setIsChecklist(note.isChecklist || false);
      setChecklist(note.checklist || []);
      setIsBold(note.isBold || false);
      setIsItalic(note.isItalic || false);
      setIsUnderline(note.isUnderline || false);
      setIsStrikethrough(note.isStrikethrough || false);
      setFontSize(note.fontSize || 16);
      setTextColor(note.textColor || 'default');
      setHighlightColor(note.highlightColor || 'transparent');
    } else {
      setEditingNote(null);
      setTitle(''); setContent(''); setSelectedColor('default'); setPinned(false);
      setSelectedLabels([]); setIsChecklist(false); setChecklist([]);
      setIsBold(false); setIsItalic(false); setIsUnderline(false); setIsStrikethrough(false);
      setFontSize(16); setTextColor('default'); setHighlightColor('transparent');
    }
    setShowEditor(true);
  };

  const saveNote = async () => {
    if (!title.trim() && !content.trim() && checklist.length === 0) {
      Alert.alert('Error', 'Note is empty');
      return;
    }
    try {
      const noteData = {
        title: title.trim(), content: content.trim(), colorId: selectedColor,
        pinned, labels: selectedLabels, isChecklist, checklist,
        folder: activeFolder === 'Trash' || activeFolder === 'Archive' ? 'All' : activeFolder === 'All' ? 'Personal' : activeFolder,
        isBold, isItalic, isUnderline, isStrikethrough,
        fontSize, textColor, highlightColor,
        updatedAt: serverTimestamp(),
      };
      if (editingNote) {
        await updateDoc(doc(db, `users/${user!.uid}/notes`, editingNote.id), noteData);
      } else {
        await addDoc(collection(db, `users/${user!.uid}/notes`), { ...noteData, createdAt: serverTimestamp() });
      }
      setShowEditor(false);
      fetchNotes();
    } catch (e) { Alert.alert('Error', 'Could not save note'); }
  };

  const moveNote = async (noteId: string, folder: string) => {
    await updateDoc(doc(db, `users/${user!.uid}/notes`, noteId), { folder, updatedAt: serverTimestamp() });
    fetchNotes();
  };

  const duplicateNote = async (note: Note) => {
    const { id, ...data } = note;
    await addDoc(collection(db, `users/${user!.uid}/notes`), { ...data, title: `${note.title} (copy)`, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    fetchNotes();
  };

  const deleteNote = (note: Note) => {
    if ((note.folder || '') === 'Trash') {
      Alert.alert('Permanently Delete', 'This note will be permanently deleted.', [
        { text: 'Cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, `users/${user!.uid}/notes`, note.id));
          fetchNotes();
        }},
      ]);
    } else {
      moveNote(note.id, 'Trash');
      Alert.alert('Moved to Trash', 'Note moved to Trash. You can restore it later.');
    }
  };

  const restoreNote = (note: Note) => {
    moveNote(note.id, 'Personal');
    Alert.alert('Restored', 'Note restored to Personal folder.');
  };

  const archiveNote = (note: Note) => {
    moveNote(note.id, 'Archive');
  };

  const togglePin = async (note: Note) => {
    await updateDoc(doc(db, `users/${user!.uid}/notes`, note.id), { pinned: !note.pinned });
    fetchNotes();
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), text: newCheckItem.trim(), checked: false }]);
    setNewCheckItem('');
  };

  const toggleCheckItem = (id: string) => setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  const removeCheckItem = (id: string) => setChecklist(checklist.filter(item => item.id !== id));

  const getNoteColor = (colorId: string) => {
    const c = NOTE_COLORS.find(nc => nc.id === colorId);
    if (!c || colorId === 'default') return colors.surface;
    return isDark ? c.dark : c.color;
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    undoRedo.pushState(text);
  };

  const handleUndo = () => { setContent(undoRedo.undo()); };
  const handleRedo = () => { setContent(undoRedo.redo()); };

  // Filters
  const filtered = notes
    .filter(n => {
      const folder = n.folder || 'Personal';
      if (activeFolder === 'All') return folder !== 'Trash' && folder !== 'Archive';
      if (activeFolder === 'Trash') return folder === 'Trash';
      if (activeFolder === 'Archive') return folder === 'Archive';
      return folder === activeFolder;
    })
    .filter(n => {
      if (!searchQuery) return true;
      return n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  const pinnedNotes = filtered.filter(n => n.pinned);
  const unpinnedNotes = filtered.filter(n => !n.pinned);

  const renderNoteCard = (note: Note) => {
    const bgColor = getNoteColor(note.colorId);
    const cardWidth = isGridView ? (SCREEN_W - 48) / 2 : SCREEN_W - 32;
    const isTrash = (note.folder || '') === 'Trash';
    const isArchived = (note.folder || '') === 'Archive';

    return (
      <TouchableOpacity
        key={note.id}
        style={[st.noteCard, {
          backgroundColor: bgColor || colors.surface,
          borderColor: note.pinned ? colors.gold : colors.cardBorder,
          width: cardWidth, borderWidth: note.pinned ? 1.5 : 1,
        }]}
        onPress={() => openEditor(note)}
        onLongPress={() => {
          const actions: any[] = [];
          if (isTrash) {
            actions.push({ text: 'Restore', onPress: () => restoreNote(note) });
            actions.push({ text: 'Delete Forever', style: 'destructive', onPress: () => deleteNote(note) });
          } else {
            actions.push({ text: 'Duplicate', onPress: () => duplicateNote(note) });
            if (!isArchived) actions.push({ text: 'Archive', onPress: () => archiveNote(note) });
            actions.push({ text: pinned ? 'Unpin' : 'Pin', onPress: () => togglePin(note) });
            actions.push({ text: 'Delete', style: 'destructive', onPress: () => deleteNote(note) });
          }
          actions.push({ text: 'Cancel', style: 'cancel' });
          Alert.alert('Note Options', note.title || 'Untitled', actions);
        }}
        activeOpacity={0.7}
      >
        {note.pinned && <MaterialCommunityIcons name="pin" size={14} color={colors.gold} style={st.pinIcon} />}
        {note.title ? <Text style={[st.noteTitle, { color: colors.text }]} numberOfLines={2}>{note.title}</Text> : null}
        {note.isChecklist && note.checklist?.length > 0 ? (
          <View style={st.checkPreview}>
            {note.checklist.slice(0, 4).map((item, idx) => (
              <View key={idx} style={st.checkPreviewRow}>
                <MaterialCommunityIcons name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={14} color={item.checked ? '#4ADE80' : colors.textTertiary} />
                <Text style={[st.checkPreviewText, { color: item.checked ? colors.textTertiary : colors.textSecondary, textDecorationLine: item.checked ? 'line-through' : 'none' }]} numberOfLines={1}>{item.text}</Text>
              </View>
            ))}
            {note.checklist.length > 4 && <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>+{note.checklist.length - 4} more</Text>}
          </View>
        ) : note.content ? (
          <Text style={[st.noteContent, { color: colors.textSecondary }]} numberOfLines={isGridView ? 5 : 3}>{note.content}</Text>
        ) : null}
        {note.labels?.length > 0 && (
          <View style={st.labelsRow}>
            {note.labels.slice(0, 2).map((label, idx) => (
              <View key={idx} style={[st.labelChip, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[st.labelChipText, { color: colors.primary }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={st.header}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>{t('feat.notes')}</Text>
          <TouchableOpacity onPress={() => setIsGridView(!isGridView)} style={st.viewToggle}>
            <MaterialCommunityIcons name={isGridView ? 'view-agenda-outline' : 'view-grid-outline'} size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Search ── */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[st.searchInput, { color: colors.text }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      {/* ── Folders ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.folderRow}>
        {FOLDERS.map(folder => {
          const isActive = activeFolder === folder;
          const icon = folder === 'Trash' ? 'delete-outline' : folder === 'Archive' ? 'archive-outline' : folder === 'All' ? 'folder-multiple-outline' : 'folder-outline';
          return (
            <TouchableOpacity key={folder} style={[st.folderChip, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.border }]} onPress={() => setActiveFolder(folder)}>
              <MaterialCommunityIcons name={icon as any} size={14} color={isActive ? '#FFF' : colors.textSecondary} />
              <Text style={[st.folderText, { color: isActive ? '#FFF' : colors.text }]}>{folder}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Notes List ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        {pinnedNotes.length > 0 && (
          <>
            <View style={st.sectionRow}>
              <MaterialCommunityIcons name="pin" size={12} color={colors.gold} />
              <Text style={[st.sectionLabel, { color: colors.gold }]}>PINNED</Text>
            </View>
            <View style={[st.notesGrid, isGridView && st.notesGridRow]}>{pinnedNotes.map(renderNoteCard)}</View>
          </>
        )}
        {unpinnedNotes.length > 0 && pinnedNotes.length > 0 && (
          <Text style={[st.sectionLabel, { color: colors.textTertiary, marginTop: 14, marginBottom: 6 }]}>OTHERS</Text>
        )}
        <View style={[st.notesGrid, isGridView && st.notesGridRow]}>{unpinnedNotes.map(renderNoteCard)}</View>

        {filtered.length === 0 && (
          <View style={st.empty}>
            <MaterialCommunityIcons name={activeFolder === 'Trash' ? 'delete-empty-outline' : activeFolder === 'Archive' ? 'archive-off-outline' : 'note-off-outline'} size={56} color={colors.textTertiary} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>
              {activeFolder === 'Trash' ? 'Trash is empty' : activeFolder === 'Archive' ? 'No archived notes' : 'No notes yet'}
            </Text>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>
              {activeFolder === 'Trash' ? 'Deleted notes appear here' : activeFolder === 'Archive' ? 'Archived notes appear here' : 'Tap + to create your first note'}
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      {activeFolder !== 'Trash' && (
        <TouchableOpacity style={st.fab} onPress={() => openEditor()} activeOpacity={0.8}>
          <LinearGradient colors={['#D94F00', '#FF8C00']} style={st.fabGrad}>
            <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ════ Editor Modal ════ */}
      <Modal visible={showEditor} animationType="slide" presentationStyle="pageSheet">
        <View style={[st.editorContainer, { backgroundColor: getNoteColor(selectedColor) || colors.background }]}>
          {/* Editor header */}
          <View style={[st.editorHeader, { borderColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={st.editorActions}>
              <TouchableOpacity onPress={handleUndo} disabled={!undoRedo.canUndo} style={st.editorBtn}>
                <MaterialCommunityIcons name="undo" size={20} color={undoRedo.canUndo ? colors.text : colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRedo} disabled={!undoRedo.canRedo} style={st.editorBtn}>
                <MaterialCommunityIcons name="redo" size={20} color={undoRedo.canRedo ? colors.text : colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPinned(!pinned)} style={st.editorBtn}>
                <MaterialCommunityIcons name={pinned ? 'pin' : 'pin-outline'} size={20} color={pinned ? colors.gold : colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMoreActions(true); }} style={st.editorBtn}>
                <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNote} style={[st.saveBtn, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="check" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Format toolbar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.formatBar, { borderColor: colors.divider }]} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
            <TouchableOpacity onPress={() => setIsBold(!isBold)} style={[st.fmtBtn, isBold && { backgroundColor: colors.primary + '20' }]}>
              <Text style={[st.fmtBtnText, { color: colors.text, fontWeight: '800' }]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsItalic(!isItalic)} style={[st.fmtBtn, isItalic && { backgroundColor: colors.primary + '20' }]}>
              <Text style={[st.fmtBtnText, { color: colors.text, fontStyle: 'italic' }]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsUnderline(!isUnderline)} style={[st.fmtBtn, isUnderline && { backgroundColor: colors.primary + '20' }]}>
              <Text style={[st.fmtBtnText, { color: colors.text, textDecorationLine: 'underline' }]}>U</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsStrikethrough(!isStrikethrough)} style={[st.fmtBtn, isStrikethrough && { backgroundColor: colors.primary + '20' }]}>
              <Text style={[st.fmtBtnText, { color: colors.text, textDecorationLine: 'line-through' }]}>S</Text>
            </TouchableOpacity>
            <View style={[st.fmtDivider, { backgroundColor: colors.divider }]} />
            <TouchableOpacity onPress={() => setShowFontSizePicker(!showFontSizePicker)} style={st.fmtBtn}>
              <MaterialCommunityIcons name="format-size" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTextColorPicker(!showTextColorPicker)} style={st.fmtBtn}>
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name="format-color-text" size={18} color={textColor === 'default' ? colors.text : textColor} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHighlightPicker(!showHighlightPicker)} style={st.fmtBtn}>
              <MaterialCommunityIcons name="format-color-highlight" size={18} color={highlightColor !== 'transparent' ? highlightColor : colors.text} />
            </TouchableOpacity>
            <View style={[st.fmtDivider, { backgroundColor: colors.divider }]} />
            <TouchableOpacity onPress={() => setShowColorPicker(!showColorPicker)} style={st.fmtBtn}>
              <MaterialCommunityIcons name="palette-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLabelPicker(!showLabelPicker)} style={st.fmtBtn}>
              <MaterialCommunityIcons name="label-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsChecklist(!isChecklist)} style={[st.fmtBtn, isChecklist && { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="checkbox-marked-outline" size={18} color={isChecklist ? colors.primary : colors.textTertiary} />
            </TouchableOpacity>
          </ScrollView>

          {/* Font size picker */}
          {showFontSizePicker && (
            <View style={[st.pickerRow, { borderColor: colors.divider }]}>
              {FONT_SIZES.map(s => (
                <TouchableOpacity key={s} onPress={() => { setFontSize(s); setShowFontSizePicker(false); }}
                  style={[st.pickerItem, fontSize === s && { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[st.pickerItemText, { color: colors.text, fontSize: Math.min(s, 18) }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Text color picker */}
          {showTextColorPicker && (
            <View style={[st.pickerRow, { borderColor: colors.divider }]}>
              {TEXT_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => { setTextColor(c); setShowTextColorPicker(false); }}
                  style={[st.colorCircle, { backgroundColor: c === 'default' ? colors.text : c, borderColor: textColor === c ? colors.primary : colors.border }]}>
                  {c === 'default' && <MaterialCommunityIcons name="format-letter-case" size={12} color={isDark ? '#000' : '#FFF'} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Highlight picker */}
          {showHighlightPicker && (
            <View style={[st.pickerRow, { borderColor: colors.divider }]}>
              {HIGHLIGHT_COLORS.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => { setHighlightColor(c); setShowHighlightPicker(false); }}
                  style={[st.colorCircle, { backgroundColor: c === 'transparent' ? colors.surface : c, borderColor: highlightColor === c ? colors.primary : colors.border }]}>
                  {c === 'transparent' && <MaterialCommunityIcons name="close" size={12} color={colors.textTertiary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Note color picker */}
          {showColorPicker && (
            <View style={[st.pickerRow, { borderColor: colors.divider }]}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity key={c.id} onPress={() => { setSelectedColor(c.id); setShowColorPicker(false); }}
                  style={[st.colorCircle, { backgroundColor: isDark ? c.dark || colors.surface : c.color || colors.surface, borderColor: selectedColor === c.id ? colors.primary : colors.border, borderWidth: selectedColor === c.id ? 2.5 : 1 }]}>
                  {selectedColor === c.id && <MaterialCommunityIcons name="check" size={12} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Label picker */}
          {showLabelPicker && (
            <View style={[st.labelPicker, { borderColor: colors.divider }]}>
              {FOLDERS.filter(f => !['All', 'Trash', 'Archive'].includes(f)).map(label => (
                <TouchableOpacity key={label}
                  style={[st.labelPickItem, { backgroundColor: selectedLabels.includes(label) ? colors.primary + '15' : 'transparent' }]}
                  onPress={() => setSelectedLabels(selectedLabels.includes(label) ? selectedLabels.filter(l => l !== label) : [...selectedLabels, label])}>
                  <MaterialCommunityIcons name={selectedLabels.includes(label) ? 'label' : 'label-outline'} size={16} color={selectedLabels.includes(label) ? colors.primary : colors.textTertiary} />
                  <Text style={{ fontSize: 13, color: selectedLabels.includes(label) ? colors.primary : colors.text }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Editor body */}
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={st.editorBody} keyboardShouldPersistTaps="handled">
              <TextInput
                style={[st.editorTitle, { color: colors.text }]}
                placeholder="Title"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                multiline
              />

              {isChecklist ? (
                <View style={st.checklistEditor}>
                  {checklist.map((item) => (
                    <View key={item.id} style={[st.checkItemRow, { borderColor: colors.divider }]}>
                      <TouchableOpacity onPress={() => toggleCheckItem(item.id)}>
                        <MaterialCommunityIcons name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={item.checked ? '#4ADE80' : colors.textTertiary} />
                      </TouchableOpacity>
                      <Text style={[st.checkItemText, { color: item.checked ? colors.textTertiary : colors.text, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.text}</Text>
                      <TouchableOpacity onPress={() => removeCheckItem(item.id)}>
                        <Ionicons name="close" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={st.addCheckRow}>
                    <MaterialCommunityIcons name="plus" size={22} color={colors.textTertiary} />
                    <TextInput style={[st.addCheckInput, { color: colors.text }]} placeholder="Add item..." placeholderTextColor={colors.textTertiary} value={newCheckItem} onChangeText={setNewCheckItem} onSubmitEditing={addCheckItem} returnKeyType="done" />
                  </View>
                </View>
              ) : (
                <TextInput
                  style={[st.editorContent, {
                    color: textColor === 'default' ? colors.text : textColor,
                    fontSize,
                    fontWeight: isBold ? '700' : '400',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    textDecorationLine: isUnderline && isStrikethrough ? 'underline line-through' : isUnderline ? 'underline' : isStrikethrough ? 'line-through' : 'none',
                    backgroundColor: highlightColor,
                  }]}
                  placeholder="Write your note..."
                  placeholderTextColor={colors.textTertiary}
                  value={content}
                  onChangeText={handleContentChange}
                  multiline
                  textAlignVertical="top"
                />
              )}

              {selectedLabels.length > 0 && (
                <View style={st.selectedLabels}>
                  {selectedLabels.map(l => (
                    <View key={l} style={[st.labelChip, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[st.labelChipText, { color: colors.primary }]}>{l}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ════ More Actions Modal ════ */}
      <Modal visible={showMoreActions} transparent animationType="fade">
        <TouchableOpacity style={st.moreOverlay} activeOpacity={1} onPress={() => setShowMoreActions(false)}>
          <View style={[st.moreSheet, { backgroundColor: colors.surface }]}>
            {[
              { icon: 'content-duplicate', label: 'Duplicate', action: () => { if (editingNote) { duplicateNote(editingNote); setShowEditor(false); } setShowMoreActions(false); } },
              { icon: 'archive-outline', label: 'Archive', action: () => { if (editingNote) { archiveNote(editingNote); setShowEditor(false); } setShowMoreActions(false); } },
              { icon: 'delete-outline', label: 'Delete', action: () => { if (editingNote) { deleteNote(editingNote); setShowEditor(false); } setShowMoreActions(false); }, color: '#EF4444' },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={st.moreItem} onPress={item.action}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color || colors.text} />
                <Text style={[st.moreItemText, { color: item.color || colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#FFF' },
  viewToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  folderRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  folderChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  folderText: { fontSize: 12, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  notesGrid: { gap: 8 },
  notesGridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteCard: { borderRadius: 14, padding: 14, borderWidth: 1, overflow: 'hidden' },
  pinIcon: { position: 'absolute', top: 8, right: 8 },
  noteTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  noteContent: { fontSize: 13, lineHeight: 18 },
  checkPreview: { gap: 3 },
  checkPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkPreviewText: { fontSize: 12, flex: 1 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  labelChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  labelChipText: { fontSize: 10, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14 },

  fab: { position: 'absolute', bottom: 30, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#D94F00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  // Editor
  editorContainer: { flex: 1 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, borderBottomWidth: 0.5 },
  editorActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editorBtn: { padding: 6 },
  saveBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },

  // Format bar
  formatBar: { maxHeight: 44, borderBottomWidth: 0.5 },
  fmtBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fmtBtnText: { fontSize: 16 },
  fmtDivider: { width: 1, height: 24, alignSelf: 'center', marginHorizontal: 4 },

  // Pickers
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: 0.5, paddingHorizontal: 12 },
  pickerItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pickerItemText: { fontWeight: '600' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  labelPicker: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8, gap: 4, borderBottomWidth: 0.5 },
  labelPickItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },

  editorBody: { flex: 1, paddingHorizontal: 20 },
  editorTitle: { fontSize: 22, fontWeight: '700', marginTop: 12, paddingVertical: 6 },
  editorContent: { fontSize: 16, lineHeight: 24, minHeight: 200, paddingVertical: 8, borderRadius: 4 },

  checklistEditor: { paddingTop: 8 },
  checkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5 },
  checkItemText: { flex: 1, fontSize: 15 },
  addCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  addCheckInput: { flex: 1, fontSize: 15 },
  selectedLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20, paddingBottom: 40 },

  // More actions
  moreOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  moreSheet: { width: 260, borderRadius: 16, padding: 8, elevation: 10 },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  moreItemText: { fontSize: 15, fontWeight: '600' },
});
