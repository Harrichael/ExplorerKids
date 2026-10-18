// The 75 basic phonograms, each with its sounds and an example word.

export const PHONOGRAMS = [
  ['a','ă|[a]pple','ā|[a]corn','ä|f[a]ther'], ['ai','ā|r[ai]n'], ['ar','är|c[ar]'], ['au','ä|h[au]l'], ['augh','ä|t[augh]t','ăf|l[augh]'],
  ['aw','ä|s[aw]'], ['ay','ā|pl[ay]'], ['b','b|[b]at'], ['bu','b|[bu]ild'], ['c','k|[c]at','s|[c]ity'], ['cei','sē|re[cei]ve'],
  ['ch','ch|[ch]in','k|s[ch]ool','sh|[ch]ef'], ['ci','sh|spe[ci]al'], ['ck','k|du[ck]'], ['d','d|[d]og'], ['dge','j|ba[dge]'],
  ['e','ĕ|[e]gg','ē|m[e]'], ['ea','ē|[ea]t','ĕ|br[ea]d','ā|st[ea]k'], ['ear','er|[ear]th'], ['ed','ĕd|want[ed]','d|play[ed]','t|jump[ed]'],
  ['ee','ē|tr[ee]'], ['ei','ā|v[ei]n','ē|prot[ei]n','ī|h[ei]st'], ['eigh','ā|[eigh]t','ī|h[eigh]t'], ['er','er|h[er]'], ['es','ĕz|box[es]','z|babi[es]'],
  ['ew','ö|fl[ew]','ū|f[ew]'], ['ey','ā|th[ey]','ē|k[ey]'], ['f','f|[f]ish'], ['g','g|[g]oat','j|[g]em'], ['gn','n|[gn]at'], ['gu','g|[gu]ess','gw|lan[gu]age'],
  ['h','h|[h]at'], ['i','ĭ|[i]t','ī|m[i]nd','ē|rad[i]o','y|on[i]on'], ['ie','ē|f[ie]ld'], ['igh','ī|n[igh]t'], ['ir','er|b[ir]d'], ['j','j|[j]am'],
  ['k','k|[k]ite'], ['kn','n|[kn]ee'], ['l','l|[l]eg'], ['m','m|[m]oon'], ['n','n|[n]est'], ['ng','ng|ri[ng]'], ['o','ŏ|[o]tter','ō|g[o]','ö|d[o]'],
  ['oa','ō|b[oa]t'], ['oe','ō|t[oe]','ö|sh[oe]'], ['oi','oi|[oi]l'], ['oo','ö|m[oo]n','ü|b[oo]k','ō|fl[oo]r'], ['or','ōr|f[or]k'],
  ['ou','ow|h[ou]se','ō|s[ou]l','ö|y[ou]','ŭ|t[ou]ch','ü|w[ou]ld'], ['ough','ŏ|th[ough]t','ō|d[ough]','ö|thr[ough]','ow|b[ough]','ŭf|t[ough]','ŏf|c[ough]'],
  ['ow','ow|c[ow]','ō|sn[ow]'], ['oy','oi|b[oy]'], ['p','p|[p]ig'], ['ph','f|[ph]one'], ['qu','kw|[qu]een','k|anti[qu]e'], ['r','r|[r]ed'],
  ['s','s|[s]un','z|ha[s]'], ['sh','sh|[sh]ip'], ['si','sh|ten[si]on','zh|vi[si]on'], ['t','t|[t]op'], ['tch','ch|ca[tch]'], ['th','th|[th]in','TH|[th]is'],
  ['ti','sh|na[ti]on'], ['u','ŭ|[u]p','ū|m[u]sic','ö|fl[u]te','ü|p[u]t'], ['ui','ö|fr[ui]t'], ['ur','er|t[ur]tle'], ['v','v|[v]an'], ['w','w|[w]ig'],
  ['wh','wh|[wh]ale'], ['wor','wer|[wor]m'], ['wr','r|[wr]ite'], ['x','ks|fo[x]','z|[x]ylophone'], ['y','y|[y]es','ĭ|g[y]m','ī|m[y]','ē|bab[y]'], ['z','z|[z]ip']
].map(([ph, ...rest]) => ({ph, sounds: rest.map(r => { const [snd, word] = r.split('|'); return {snd, word}; })}));
export const DECKS = [
  {id:'single', label:'Single letters', pick: c => c.ph.length === 1},
  {id:'multi', label:'Multi-letter', pick: c => c.ph.length > 1},
  {id:'all', label:'All phonograms', pick: () => true}
];
