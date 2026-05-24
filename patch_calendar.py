from pathlib import Path
import re
p = Path('client/src/App.jsx')
t = p.read_text(encoding='utf-8').replace('\r\n','\n')

pattern1 = r"const count = getEventCountForDate\(dateKey\)\n\s*const selected = dateKey === selectedCalendarDate"
replace1 = "const count = getEventCountForDate(dateKey)\n                const statuses = getEventStatusesForDate(dateKey)\n                const selected = dateKey === selectedCalendarDate"
t = re.sub(pattern1, replace1, t, count=1)

pattern2 = r"position: 'relative'\n\s*}}>[\n]"
replace2 = "position: 'relative',\n                    color: '#000',\n                    textAlign: 'center'\n                  }}>\n"
t = re.sub(pattern2, replace2, t, count=1)

pattern3 = r"\{count > 0 && \(\n\s*<span style=\{\{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', backgroundColor: '#673AB7', color: 'white', borderRadius: '12px', fontSize: '12px' \}\}>\{count\}건</span>\n\s*\)\}"
replace3 = "{count > 0 && (\n                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '4px' }}>\n                        {statuses.includes('pending') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9e9e9e' }} />}\n                        {statuses.includes('accepted') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1976D2' }} />}\n                        <span style={{ fontSize: '10px', color: '#000', lineHeight: '14px' }}>{count}건</span>\n                      </div>\n                    )}"
t = re.sub(pattern3, replace3, t, count=1)

t = t.replace('            <h3>{selectedCalendarDate} 일정</h3>', '            <h3>{formatSelectedDateLabel(selectedCalendarDate)} 일정</h3>', 1)

p.write_text(t.replace('\n','\r\n'), encoding='utf-8')
print('patched')
