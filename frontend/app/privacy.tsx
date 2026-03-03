import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/utils/theme';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{children}</Text>
  );

  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Last Updated */}
          <View style={[styles.updatedBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.updatedText, { color: colors.primary }]}>Last updated: March 2026</Text>
          </View>

          {/* Introduction */}
          <Section title="Introduction">
            <Paragraph>
              Verityn ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we handle your information when you use our mobile application.
            </Paragraph>
            <Paragraph>
              We designed Verityn with privacy in mind. Your data stays on your device, and we do not 
              collect, transmit, or store any personal information on external servers.
            </Paragraph>
          </Section>

          {/* Data We Store */}
          <Section title="Data Stored on Your Device">
            <Paragraph>
              Verityn stores the following information locally on your device to provide a personalized 
              news experience:
            </Paragraph>
            <BulletPoint>News category preferences you select during onboarding</BulletPoint>
            <BulletPoint>Articles you bookmark for later reading</BulletPoint>
            <BulletPoint>Custom keywords you add for personalized news</BulletPoint>
            <BulletPoint>Country and city preferences for regional news</BulletPoint>
            <BulletPoint>Your theme preference (light, dark, or system)</BulletPoint>
            <BulletPoint>Articles saved for offline reading</BulletPoint>
            <BulletPoint>Your GDPR consent preferences</BulletPoint>
          </Section>

          {/* Data We Don't Collect */}
          <Section title="Data We Do NOT Collect">
            <Paragraph>
              Verityn does not collect, transmit, or store:
            </Paragraph>
            <BulletPoint>Your name, email, or any personal identifiers</BulletPoint>
            <BulletPoint>Your location (GPS or IP-based)</BulletPoint>
            <BulletPoint>Device identifiers or advertising IDs</BulletPoint>
            <BulletPoint>Usage analytics or behavior tracking data</BulletPoint>
            <BulletPoint>Any data to third-party services</BulletPoint>
          </Section>

          {/* News Content */}
          <Section title="News Content">
            <Paragraph>
              The news articles displayed in Verityn are fetched from publicly available RSS feeds 
              provided by major European news publishers. We do not store article content on our servers.
            </Paragraph>
            <Paragraph>
              When you tap "Read more" to view full articles, you are redirected to the original 
              publisher's website. Their privacy policies apply to your interaction with their sites.
            </Paragraph>
          </Section>

          {/* Your Rights Under GDPR */}
          <Section title="Your Rights Under GDPR">
            <Paragraph>
              Under the General Data Protection Regulation (GDPR), you have the following rights:
            </Paragraph>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Right to Access:</Text> View all data stored about you 
              in Settings → Privacy & Data
            </BulletPoint>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Right to Rectification:</Text> Modify your preferences 
              at any time through the app
            </BulletPoint>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Right to Erasure:</Text> Delete all your data using 
              the "Delete My Data" option in Settings
            </BulletPoint>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Right to Withdraw Consent:</Text> Withdraw your consent 
              at any time; you may continue using the app with limited features
            </BulletPoint>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Right to Data Portability:</Text> Since data is stored 
              locally, it is already in your possession
            </BulletPoint>
          </Section>

          {/* Data Security */}
          <Section title="Data Security">
            <Paragraph>
              All data is stored securely on your device using platform-provided secure storage mechanisms:
            </Paragraph>
            <BulletPoint>On iOS: Data is stored in the Keychain</BulletPoint>
            <BulletPoint>On Android: Data is stored in encrypted SharedPreferences</BulletPoint>
            <Paragraph>
              Since we don't transmit data externally, there is no risk of data breaches on our end.
            </Paragraph>
          </Section>

          {/* Third-Party Services */}
          <Section title="Third-Party Services">
            <Paragraph>
              Verityn integrates with the following external services:
            </Paragraph>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>News Publishers:</Text> We fetch RSS feeds from BBC, 
              The Guardian, Politico EU, Euronews, DW, and other European news sources. When you visit 
              their websites, their privacy policies apply.
            </BulletPoint>
            <BulletPoint>
              <Text style={{ fontWeight: '600' }}>Expo (Development Platform):</Text> Used for app 
              distribution. See Expo's privacy policy at expo.dev/privacy
            </BulletPoint>
          </Section>

          {/* Children's Privacy */}
          <Section title="Children's Privacy">
            <Paragraph>
              Verityn is not intended for children under 16 years of age. We do not knowingly collect 
              data from children. If you believe a child has provided us with personal data, please 
              contact us.
            </Paragraph>
          </Section>

          {/* Changes to This Policy */}
          <Section title="Changes to This Policy">
            <Paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy in the app and updating the "Last updated" date.
            </Paragraph>
          </Section>

          {/* Contact Us */}
          <Section title="Contact Us">
            <Paragraph>
              If you have questions about this Privacy Policy or wish to exercise your data rights, 
              please contact us:
            </Paragraph>
            <TouchableOpacity 
              style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => Linking.openURL('mailto:privacy@verityn.app')}
            >
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>privacy@verityn.app</Text>
            </TouchableOpacity>
          </Section>

          {/* Legal Basis */}
          <View style={[styles.legalCard, { backgroundColor: `${colors.primary}08` }]}>
            <Text style={[styles.legalTitle, { color: colors.text }]}>Legal Basis for Processing</Text>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Under GDPR Article 6, our legal basis for storing data on your device is your explicit 
              consent, which you provide when accepting our data practices during onboarding. You may 
              withdraw this consent at any time.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 32 },
  
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  
  updatedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    gap: 6, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    marginBottom: 24,
  },
  updatedText: { fontSize: 13, fontWeight: '500' },
  
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  
  bulletRow: { flexDirection: 'row', marginBottom: 10, paddingRight: 8 },
  bullet: { fontSize: 18, marginRight: 10, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  
  contactCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  contactText: { fontSize: 16, fontWeight: '500' },
  
  legalCard: { padding: 18, borderRadius: 14, marginTop: 8 },
  legalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  legalText: { fontSize: 14, lineHeight: 22 },
});
