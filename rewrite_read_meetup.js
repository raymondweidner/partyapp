const fs = require('fs');

let content = fs.readFileSync('app/read-meetup.tsx', 'utf-8');

// 1. activeTab definition
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"details" | "polls" | "registries" | "proposals">("details");',
  'const [activeTab, setActiveTab] = useState<"details" | "polls" | "registries" | "proposals" | "squad" | "pastEvents">("details");'
);

// 2. The whole top part from `) : (\n            <View style={styles.tabContainer}>` to `<View style={{ backgroundColor: colors.surface...`
const startIdx = content.indexOf('          ) : (\n            <View style={styles.tabContainer}>');
const endMarker = '            <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight }}>';
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `          ) : (
            <>
              <View style={{ alignItems: "center", marginVertical: 24 }}>
                <Text style={{ fontSize: 72, marginBottom: 12 }}>{iconType || "🎉"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
                  <Text style={{ fontSize: 40, fontFamily: "Lobster_400Regular", color: colors.accent, textAlign: "center" }}>{title}</Text>
                  {(() => {
                    let bgColor = colors.accent;
                    let textColor = "#F8F9FA";
                    let bWidth = 0;
                    if (status === "Scheduled" || status === "Ongoing") bgColor = "#28a745";
                    else if (status === "Planning") bgColor = "#007bff";
                    else if (status === "Cancelled") bgColor = "#dc3545";
                    else if (status === "Completed") {
                      bgColor = "#ffffff";
                      textColor = "#000000";
                      bWidth = 1;
                    }
                    return (
                      <View style={{ backgroundColor: bgColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: bWidth, borderColor: "#ccc" }}>
                        <Text style={{ color: textColor, fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>{status}</Text>
                      </View>
                    );
                  })()}
                </View>
                <FloralDivider color={colors.accent} />
                {details ? (
                  <Text style={{ fontSize: 18, fontFamily: "Fraunces_200ExtraLight", color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginBottom: 16, marginTop: 16 }}>{details}</Text>
                ) : <View style={{ marginBottom: 16 }} />}
                {(() => {
                  const tribe = tribes.find(t => t.id === selectedMeetup.tribe_id);
                  if (!tribe) return null;
                  return (
                    <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: colors.textSecondary, textAlign: "center", marginBottom: 24 }}>
                      {tribe.icon_type} {tribe.name}
                    </Text>
                  );
                })()}

                {(selectedMeetup as any).creator_id === member?.id && !updating && (
                  <View style={{ width: "100%", paddingHorizontal: 20, marginBottom: 24, gap: 10 }}>
                    {selectedMeetup.status !== "Cancelled" && !(selectedMeetup.status === "Completed" && !selectedMeetup.recurrence_type) && (
                      <TouchableOpacity
                        style={[styles.primaryButton, { width: "100%" }]}
                        onPress={() => router.push({ pathname: "/write-meetup", params: { id: selectedMeetup.id, tribeId: selectedMeetup.tribe_id } })}
                      >
                        <Text style={styles.primaryButtonText}>Edit Details</Text>
                      </TouchableOpacity>
                    )}
                    {selectedMeetup.status !== "Cancelled" && selectedMeetup.status !== "Completed" && (
                      <TouchableOpacity
                        style={[styles.primaryButton, { width: "100%", backgroundColor: "#4E3629" }]}
                        onPress={handleCancelMeetup}
                      >
                        <Text style={styles.primaryButtonText}>Cancel Meetup</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

          {activeTab === "details" && (
${endMarker}`;
  
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx + endMarker.length);
}

// 3. Remove old Edit Meetup button and Cancel Meetup buttons from wherever they are.
content = content.replace(/\{\(selectedMeetup as any\)\.creator_id === member\?\.id && selectedMeetup\.status !== "Cancelled" && selectedMeetup\.status !== "Completed" && \(\s*<View style=\{\{ marginTop: 10, marginBottom: 20 \}\}>\s*<TouchableOpacity\s*style=\{\[styles\.primaryButton, \{ backgroundColor: "#4E3629" \}\]\}\s*onPress=\{handleCancelMeetup\}\s*>\s*<Text style=\{styles\.primaryButtonText\}>Cancel Meetup<\/Text>\s*<\/TouchableOpacity>\s*<\/View>\s*\)\}/g, '');

content = content.replace(/\{updating \? \([\s\S]*?\) : isEditing \? \([\s\S]*?\) : \(selectedMeetup as any\)\.creator_id === member\?\.id \? \([\s\S]*?\) : null\}/g, '');

content = content.replace(/<FloralDivider color=\{colors\.accent\} \/>/g, (match, offset) => {
  if (offset > startIdx + 2000) return ''; // remove extra floral divider below the removed edit buttons
  return match;
});

// 4. Move Squad to its own tab
let squadStart = content.indexOf('<Text style={globalStyles.sectionTitle}>🔥 Squad</Text>');
let squadBlock = '';
if (squadStart !== -1) {
  let viewStart = content.lastIndexOf('<View style={{ marginTop: 24', squadStart);
  if (viewStart === -1) {
    viewStart = content.lastIndexOf('<View', squadStart);
  }
  let viewEnd = content.indexOf('</View>', content.indexOf('</View>', content.indexOf('+ Create Squad Chat', viewStart)) + 10) + 7;
  
  squadBlock = content.slice(viewStart, viewEnd);
  content = content.slice(0, viewStart) + content.slice(viewEnd);
}

let pastStart = content.indexOf('🎉 Past Events');
let pastEventsBlock = '';
if (pastStart !== -1) {
  let pastViewStart = content.lastIndexOf('<View style={{ marginTop: 24', pastStart);
  let pastViewEnd = content.indexOf('</View>', content.indexOf('</ScrollView>', pastViewStart) + 10) + 7;
  if (pastViewStart !== -1) {
    pastEventsBlock = content.slice(pastViewStart, pastViewEnd);
    content = content.slice(0, pastViewStart) + content.slice(pastViewEnd);
  }
}

if (squadBlock || pastEventsBlock) {
  const scrollViewEndIdx = content.indexOf('</ScrollView>', content.lastIndexOf('MemberModal'));
  if (scrollViewEndIdx !== -1) {
    const tabBlocks = `
          {activeTab === "squad" && (
            <View style={globalStyles.sectionPanel}>
              ${squadBlock}
            </View>
          )}

          {activeTab === "pastEvents" && (
            <View style={globalStyles.sectionPanel}>
              ${pastEventsBlock}
            </View>
          )}
`;
    content = content.slice(0, scrollViewEndIdx) + tabBlocks + content.slice(scrollViewEndIdx);
  }
}

// 5. Update bottomNav to include Squad and Past Events
const bottomNavEnd = content.indexOf('</View>\n    </View>\n    );\n  }');
if (bottomNavEnd !== -1) {
  const bottomNavAdditions = `
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab("squad")}
        >
          <Text style={styles.bottomNavIcon}>🔥</Text>
          <Text style={[styles.bottomNavText, activeTab === "squad" && styles.bottomNavTextActive]}>Squad</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab("pastEvents")}
        >
          <Text style={styles.bottomNavIcon}>⏪</Text>
          <Text style={[styles.bottomNavText, activeTab === "pastEvents" && styles.bottomNavTextActive]}>Past Events</Text>
        </TouchableOpacity>
`;
  content = content.slice(0, bottomNavEnd) + bottomNavAdditions + content.slice(bottomNavEnd);
}

fs.writeFileSync('app/read-meetup.tsx', content, 'utf-8');
