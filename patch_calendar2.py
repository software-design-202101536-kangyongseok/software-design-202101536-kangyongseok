from pathlib import Path
p=Path('client/src/App.jsx')
lines=p.read_text(encoding='utf-8').splitlines()
start=None
end=None
for i,line in enumerate(lines):
    if line.strip() == '{calendarDays.map(day => {':
        start=i
    if start is not None and line.strip() == '})}':
        end=i
        break
if start is None or end is None:
    raise SystemExit('Block boundaries not found')
new_block=[
"            {calendarDays.map(day => {",
"              const dateKey = formatDateKey(day)",
"              const count = getEventCountForDate(dateKey)",
"              const statuses = getEventStatusesForDate(dateKey)",
"              const selected = dateKey === selectedCalendarDate",
"              return (",
"                <button key={dateKey} type=\"button\" onClick={() => handleDateSelect(dateKey)} style={{",
"                  border: selected ? '2px solid #673AB7' : '1px solid #ddd',",
"                  backgroundColor: selected ? '#f3e5f5' : '#fff',",
"                  padding: '10px',",
"                  minHeight: '70px',",
"                  cursor: 'pointer',",
"                  position: 'relative',",
"                  color: '#000',",
"                  textAlign: 'center'",
"                }}>",
"                  <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>{day.getDate()}</div>",
"                  {count > 0 && (",
"                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '4px' }}>",
"                      {statuses.includes('pending') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9e9e9e' }} />}",
"                      {statuses.includes('accepted') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1976D2' }} />}",
"                      <span style={{ fontSize: '10px', color: '#000', lineHeight: '14px' }}>{count}건</span>",
"                    </div>",
"                  )}",
"                </button>",
"              )",
"            })}"
]
lines = lines[:start] + new_block + lines[end+1:]
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('rewritten')
