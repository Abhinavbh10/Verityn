import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { saveGDPRConsent } from '../utils/gdpr';

interface GDPRConsentModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function GDPRConsentModal({ visible, onAccept }: GDPRConsentModalProps) {
  const { colors } = useTheme();
  const [personalization, setPersonalization] = useState(true);
  const [localStorage, setLocalStorage] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const handleAcceptAll = async () => {
    await saveGDPRConsent({
      analytics: false, // We don't use analytics
      personalization: true,
      localStorage: true,
    });
    onAccept();
  };

  const handleAcceptSelected = async () => {
    await saveGDPRConsent({
      analytics: false,
      personalization,
      localStorage,
    });
    onAccept();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Your Privacy Matters</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We respect your data rights under GDPR
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Verityn stores data locally on your device to provide a personalized news experience. 
              We do not collect, sell, or share your personal data with third parties.
            </Text>

            {/* What we store */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>What we store locally:</Text>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>Your news category preferences</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>Bookmarked articles</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>Custom keywords for personalization</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>Country/city preferences</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>Theme preference (light/dark)</Text>
              </View>
            </View>

            {/* What we don't do */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>What we don't do:</Text>
              <View style={styles.listItem}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>No data sent to external servers</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>No tracking or analytics</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>No data sold to third parties</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>No advertising profiles</Text>
              </View>
            </View>

            {/* Customize Options */}
            <TouchableOpacity 
              style={styles.customizeToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={[styles.customizeText, { color: colors.primary }]}>
                {showDetails ? 'Hide options' : 'Customize preferences'}
              </Text>
              <Ionicons 
                name={showDetails ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>

            {showDetails && (
              <View style={[styles.optionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Personalization</Text>
                    <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                      Store your preferences for a tailored experience
                    </Text>
                  </View>
                  <Switch
                    value={personalization}
                    onValueChange={setPersonalization}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={personalization ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Local Storage</Text>
                    <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                      Save bookmarks and offline articles on your device
                    </Text>
                  </View>
                  <Switch
                    value={localStorage}
                    onValueChange={setLocalStorage}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={localStorage ? colors.primary : colors.textMuted}
                  />
                </View>
              </View>
            )}

            {/* Your Rights */}
            <View style={[styles.rightsCard, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.rightsTitle, { color: colors.primary }]}>Your GDPR Rights</Text>
              <Text style={[styles.rightsText, { color: colors.textSecondary }]}>
                You can view, export, or delete all your data at any time from Settings → Privacy & Data. 
                You may also withdraw consent and continue using the app with limited features.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.acceptAllButton, { backgroundColor: colors.primary }]}
            onPress={handleAcceptAll}
            data-testid="gdpr-accept-all"
          >
            <Text style={styles.acceptAllText}>Accept All & Continue</Text>
          </TouchableOpacity>
          
          {showDetails && (
            <TouchableOpacity 
              style={[styles.customButton, { borderColor: colors.primary }]}
              onPress={handleAcceptSelected}
              data-testid="gdpr-accept-selected"
            >
              <Text style={[styles.customButtonText, { color: colors.primary }]}>Accept Selected</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.policyLink}
            onPress={() => Linking.openURL('https://verityn.app/privacy')}
          >
            <Text style={[styles.policyLinkText, { color: colors.textMuted }]}>
              Read our full Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  
  // Header
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 },
  iconContainer: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  
  // Content
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  description: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  
  // Info Cards
  infoCard: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  listText: { fontSize: 14, flex: 1, lineHeight: 20 },
  
  // Customize
  customizeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  customizeText: { fontSize: 15, fontWeight: '600' },
  
  // Options Card
  optionsCard: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionInfo: { flex: 1, marginRight: 16 },
  optionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  optionDesc: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1, marginVertical: 16 },
  
  // Rights Card
  rightsCard: { borderRadius: 16, padding: 18, marginBottom: 8 },
  rightsTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  rightsText: { fontSize: 13, lineHeight: 20 },
  
  // Footer
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1 },
  acceptAllButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  acceptAllText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  customButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16, borderWidth: 2 },
  customButtonText: { fontSize: 16, fontWeight: '600' },
  policyLink: { alignItems: 'center', paddingVertical: 8 },
  policyLinkText: { fontSize: 14, textDecorationLine: 'underline' },
});
