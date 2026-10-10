# WCAG 2.x contrast for site text/background pairs after the app-token migration.
def rgb(h):h=h.lstrip('#')[:6];return [int(h[i:i+2],16) for i in (0,2,4)]
def L(h):
  c=[x/255 for x in rgb(h)];c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c];return .2126*c[0]+.7152*c[1]+.0722*c[2]
def cr(a,b):a,b=sorted([L(a),L(b)]);return (b+.05)/(a+.05)
def blend(fg,a,bg):return '#'+''.join('%02x'%round(x*a+y*(1-a)) for x,y in zip(rgb(fg),rgb(bg)))
P=[('Body paper on ink','#f6f7fb','#0d0f12',4.5),('Muted on ink','#abb5c6','#0d0f12',4.5),('Muted on surface','#abb5c6','#171b21',4.5),
('Paper on surface','#f6f7fb','#171b21',4.5),('Lime on ink','#d5ff75','#0d0f12',4.5),('Lime on surface','#d5ff75','#171b21',4.5),
('Lime on lime container (icon btn)','#d5ff75','#2b3821',4.5),('CTA ink on lime','#0d0f12','#d5ff75',4.5),('CTA ink on hover lime','#0d0f12','#e2fcab',4.5),
('CTA ink on active lime','#0d0f12','#c1e76b',4.5),('Disabled CTA text','#abb5c6','#343d49',4.5),('Placeholder (outline) on input','#778396','#0d0f12',4.5),
('Article body text','#d0d6e0','#0d0f12',4.5),('Guide card text muted','#abb5c6','#242a33',4.5),
('Light story: text','#0d0f12','#f6f7fb',4.5),('Light story: muted','#5f6064','#f6f7fb',4.5),('Light story: lime-on-light','#65793e','#f6f7fb',4.5),
('Light tint chapter: text','#0d0f12','#eaebef',4.5),('Light tint chapter: muted','#5f6064','#eaebef',4.5),('Light tint chapter: lime-on-light (darkened)','#5c6e3a','#eaebef',4.5),
('Journey pressed: ink on lime','#0d0f12','#d5ff75',4.5),('Story CTA ink on lime','#0d0f12','#d5ff75',4.5),
('Dark chapter: paper','#f6f7fb','#171b21',4.5),('Dark chapter: muted','#abb5c6','#171b21',4.5),('Dark chapter: lime','#d5ff75','#171b21',4.5),
('Closing: ink on lime','#0d0f12','#d5ff75',4.5),('Closing: eyebrow/fine print','#2b3821','#d5ff75',4.5),('Closing CTA paper on ink','#f6f7fb','#0d0f12',4.5),
('Mobile CTA span','#abb5c6',blend('#0d0f12',0xf5/255,'#f6f7fb'),4.5),('QR hint text (ink b3 on paper)',blend('#0d0f12',0xb3/255,'#f6f7fb'),'#f6f7fb',4.5),
('QR modules ink on paper (scan)','#0d0f12','#f6f7fb',3),('Pin check lime on ink','#d5ff75','#0d0f12',4.5)]
out=['| Pair | FG | BG | Ratio | Need | Result |','|---|---|---|---|---|---|'];fails=0
for n,f,b,need in P:
  r=cr(f,b);ok=r>=need;fails+=not ok;out.append(f'| {n} | {f} | {b} | {r:.2f} | {need} | {"PASS" if ok else "FAIL"} |')
out.append(f'\n{len(P)} pairs, {fails} fail(s).');print('\n'.join(out))
