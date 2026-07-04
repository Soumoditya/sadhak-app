import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db, collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, setDoc, serverTimestamp } from '../config/firebase';

interface Submission {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileSize: number;
  uploadedBy: string;
  status: 'pending_review' | 'approved' | 'rejected';
  uploadedAt: any;
}

export default function AdminScreen() {
  const { isAdmin, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalBooks: 0, pendingReviews: 0 });

  useEffect(() => {
    if (isAdmin) {
      fetchSubmissions();
      fetchStats();
    }
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'library_submissions'), where('status', '==', 'pending_review'));
      const snap = await getDocs(q);
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const booksSnap = await getDocs(collection(db, 'library'));
      const pendingSnap = await getDocs(query(collection(db, 'library_submissions'), where('status', '==', 'pending_review')));
      setStats({
        totalUsers: usersSnap.size,
        totalBooks: booksSnap.size,
        pendingReviews: pendingSnap.size,
      });
    } catch (e) { console.error(e); }
  };

  const approveSubmission = async (sub: Submission) => {
    try {
      // Copy to library collection
      await setDoc(doc(db, 'library', sub.id), {
        title: sub.title,
        author: sub.author,
        category: sub.category,
        description: sub.description,
        cloudinaryUrl: sub.cloudinaryUrl,
        cloudinaryPublicId: sub.cloudinaryPublicId,
        fileSize: sub.fileSize,
        uploadedBy: sub.uploadedBy,
        uploadedAt: sub.uploadedAt,
        downloadCount: 0,
        approvedBy: profile?.uid,
        approvedAt: serverTimestamp(),
      });
      // Update submission status
      await updateDoc(doc(db, 'library_submissions', sub.id), {
        status: 'approved',
        reviewedBy: profile?.uid,
        reviewedAt: serverTimestamp(),
      });
      Alert.alert('Approved', `"${sub.title}" is now published in the library.`);
      fetchSubmissions();
      fetchStats();
    } catch (e) {
      Alert.alert('Error', 'Could not approve submission.');
    }
  };

  const rejectSubmission = async (sub: Submission) => {
    Alert.alert('Reject', `Reject "${sub.title}"?`, [
      { text: 'Cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await updateDoc(doc(db, 'library_submissions', sub.id), {
              status: 'rejected',
              reviewedBy: profile?.uid,
              reviewedAt: serverTimestamp(),
            });
            Alert.alert('Rejected', 'Submission has been rejected.');
            fetchSubmissions();
            fetchStats();
          } catch (e) { Alert.alert('Error', 'Could not reject submission.'); }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={64} color={colors.textTertiary} />
        <Text style={[styles.noAccess, { color: colors.textSecondary }]}>Admin access required</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Users', value: stats.totalUsers, icon: 'account-group', color: '#1565C0' },
          { label: 'Books', value: stats.totalBooks, icon: 'bookshelf', color: '#2D6A4F' },
          { label: 'Pending', value: stats.pendingReviews, icon: 'clock-alert-outline', color: '#FF8C00' },
        ].map((stat, idx) => (
          <View key={idx} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Review Queue */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        <MaterialCommunityIcons name="file-document-check-outline" size={18} color={colors.primary} /> Review Queue
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : submissions.length === 0 ? (
        <View style={[styles.emptyReview, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <MaterialCommunityIcons name="check-decagram" size={40} color={colors.tulsiGreen} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All caught up! No pending reviews.</Text>
        </View>
      ) : (
        submissions.map(sub => (
          <View key={sub.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.reviewHeader}>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color="#D94F00" />
              <View style={styles.reviewInfo}>
                <Text style={[styles.reviewTitle, { color: colors.text }]}>{sub.title}</Text>
                <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]}>{sub.author} • {sub.category}</Text>
              </View>
            </View>
            {sub.description ? (
              <Text style={[styles.reviewDesc, { color: colors.textSecondary }]} numberOfLines={2}>{sub.description}</Text>
            ) : null}
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.tulsiGreen + '15' }]}
                onPress={() => approveSubmission(sub)}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.tulsiGreen} />
                <Text style={[styles.approveBtnText, { color: colors.tulsiGreen }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, { backgroundColor: colors.error + '15' }]}
                onPress={() => rejectSubmission(sub)}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.error} />
                <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  noAccess: { fontSize: 16, marginTop: 12 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  emptyReview: { marginHorizontal: 16, padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  reviewCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewInfo: { flex: 1 },
  reviewTitle: { fontSize: 16, fontWeight: '700' },
  reviewAuthor: { fontSize: 12, marginTop: 2 },
  reviewDesc: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  reviewActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '600' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  rejectBtnText: { fontSize: 14, fontWeight: '600' },
});
