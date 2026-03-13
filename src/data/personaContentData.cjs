/**
 * Consolidated Persona Content Data — CommonJS version
 * Used by api/databricks/assessment/run.js (serverless, CJS context)
 * 
 * Location: /src/data/personaContentData.cjs
 */

'use strict';

function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn(`[PersonaContentData] Failed to load ${path}: ${e.message}`);
    return null;
  }
}

const personaContentMap = {
  // Luminaries
  'alex-bogusky':           safeRequire('./persona-content/alex-bogusky.json'),
  'bill-bernbach':          safeRequire('./persona-content/bill-bernbach.json'),
  'byron-sharp':            safeRequire('./persona-content/byron-sharp.json'),
  'claude-hopkins':         safeRequire('./persona-content/claude-hopkins.json'),
  'coco-chanel':            safeRequire('./persona-content/coco-chanel.json'),
  'dan-wieden':             safeRequire('./persona-content/dan-wieden.json'),
  'dave-trott':             safeRequire('./persona-content/dave-trott.json'),
  'david-ogilvy':           safeRequire('./persona-content/david-ogilvy.json'),
  'don-draper':             safeRequire('./persona-content/don-draper.json'),
  'drayton-bird':           safeRequire('./persona-content/drayton-bird.json'),
  'estee-lauder':           safeRequire('./persona-content/estee-lauder.json'),
  'eugene-schwartz':        safeRequire('./persona-content/eugene-schwartz.json'),
  'george-lois':            safeRequire('./persona-content/george-lois.json'),
  'greg-hahn':              safeRequire('./persona-content/greg-hahn.json'),
  'howard-gossage':         safeRequire('./persona-content/howard-gossage.json'),
  'jeff-goodby':            safeRequire('./persona-content/jeff-goodby.json'),
  'john-hegarty':           safeRequire('./persona-content/john-hegarty.json'),
  'joseph-sugarman':        safeRequire('./persona-content/joseph-sugarman.json'),
  'lee-clow':               safeRequire('./persona-content/lee-clow.json'),
  'leo-burnett':            safeRequire('./persona-content/leo-burnett.json'),
  'luminaries-tech-cto':    safeRequire('./persona-content/luminaries-tech-cto.json'),
  'margaret-johnson':       safeRequire('./persona-content/margaret-johnson.json'),
  'mary-kay-ash':           safeRequire('./persona-content/mary-kay-ash.json'),
  'mary-wells-lawrence':    safeRequire('./persona-content/mary-wells-lawrence.json'),
  'oprah-winfrey':          safeRequire('./persona-content/oprah-winfrey.json'),
  'paula-scher':            safeRequire('./persona-content/paula-scher.json'),
  'rich-silverstein':       safeRequire('./persona-content/rich-silverstein.json'),
  'rory-sutherland':        safeRequire('./persona-content/rory-sutherland.json'),
  'rosser-reeves':          safeRequire('./persona-content/rosser-reeves.json'),
  'russell-colley':         safeRequire('./persona-content/russell-colley.json'),
  'seth-godin':             safeRequire('./persona-content/seth-godin.json'),
  'steve-jobs':             safeRequire('./persona-content/steve-jobs.json'),
  'tiffany-rolfe':          safeRequire('./persona-content/tiffany-rolfe.json'),
  'willy-wonka':            safeRequire('./persona-content/willy-wonka.json'),

  // Panelists
  'panelist-millennial-parent': safeRequire('./persona-content/panelist-millennial-parent.json'),

  // Consumers
  'consumers-b2b-department':   safeRequire('./persona-content/consumers-b2b-department.json'),
  'consumers-b2b-procurement':  safeRequire('./persona-content/consumers-b2b-procurement.json'),
  'consumers-b2b-smb':          safeRequire('./persona-content/consumers-b2b-smb.json'),
  'consumers-b2c-impulse':      safeRequire('./persona-content/consumers-b2c-impulse.json'),
  'consumers-b2c-loyal':        safeRequire('./persona-content/consumers-b2c-loyal.json'),
  'consumers-b2c-research':     safeRequire('./persona-content/consumers-b2c-research.json'),

  // Colleagues
  'colleagues-brand-manager':      safeRequire('./persona-content/colleagues-brand-manager.json'),
  'colleagues-ceo':                safeRequire('./persona-content/colleagues-ceo.json'),
  'colleagues-cfo':                safeRequire('./persona-content/colleagues-cfo.json'),
  'colleagues-cmo':                safeRequire('./persona-content/colleagues-cmo.json'),
  'colleagues-cs-manager':         safeRequire('./persona-content/colleagues-cs-manager.json'),
  'colleagues-cto':                safeRequire('./persona-content/colleagues-cto.json'),
  'colleagues-director-ops':       safeRequire('./persona-content/colleagues-director-ops.json'),
  'colleagues-director-product':   safeRequire('./persona-content/colleagues-director-product.json'),
  'colleagues-director-sales':     safeRequire('./persona-content/colleagues-director-sales.json'),
  'colleagues-engineer-architect': safeRequire('./persona-content/colleagues-engineer-architect.json'),
  'colleagues-engineer-lead':      safeRequire('./persona-content/colleagues-engineer-lead.json'),
  'colleagues-marketing-manager':  safeRequire('./persona-content/colleagues-marketing-manager.json'),
  'colleagues-product-manager':    safeRequire('./persona-content/colleagues-product-manager.json'),
  'colleagues-product-owner':      safeRequire('./persona-content/colleagues-product-owner.json'),
  'colleagues-sales-manager':      safeRequire('./persona-content/colleagues-sales-manager.json'),
  'colleagues-sales-rep':          safeRequire('./persona-content/colleagues-sales-rep.json'),
  'colleagues-support-lead':       safeRequire('./persona-content/colleagues-support-lead.json'),

  // Cultural Voices
  'cultural-eco-advocate':           safeRequire('./persona-content/cultural-eco-advocate.json'),
  'cultural-gamer':                  safeRequire('./persona-content/cultural-gamer.json'),
  'cultural-genz-activist':          safeRequire('./persona-content/cultural-genz-activist.json'),
  'cultural-genz-creator':           safeRequire('./persona-content/cultural-genz-creator.json'),
  'cultural-genz-entrepreneur':      safeRequire('./persona-content/cultural-genz-entrepreneur.json'),
  'cultural-millennial-influencer':  safeRequire('./persona-content/cultural-millennial-influencer.json'),
  'cultural-millennial-professional':safeRequire('./persona-content/cultural-millennial-professional.json'),
  'cultural-mindfulness':            safeRequire('./persona-content/cultural-mindfulness.json'),
  'cultural-rural-community':        safeRequire('./persona-content/cultural-rural-community.json'),
  'cultural-suburban-family':        safeRequire('./persona-content/cultural-suburban-family.json'),
  'cultural-tech-innovator':         safeRequire('./persona-content/cultural-tech-innovator.json'),
  'cultural-urban-artist':           safeRequire('./persona-content/cultural-urban-artist.json'),
  'cultural-urban-trendsetter':      safeRequire('./persona-content/cultural-urban-trendsetter.json'),
  'cultural-wellness-guru':          safeRequire('./persona-content/cultural-wellness-guru.json'),
  'cultural-zero-waste':             safeRequire('./persona-content/cultural-zero-waste.json'),

  // Grade - Demographics
  'grade-demo-boomer':        safeRequire('./persona-content/grade-demo-boomer.json'),
  'grade-demo-couple':        safeRequire('./persona-content/grade-demo-couple.json'),
  'grade-demo-family-teen':   safeRequire('./persona-content/grade-demo-family-teen.json'),
  'grade-demo-family-young':  safeRequire('./persona-content/grade-demo-family-young.json'),
  'grade-demo-gen-x':         safeRequire('./persona-content/grade-demo-gen-x.json'),
  'grade-demo-gen-z':         safeRequire('./persona-content/grade-demo-gen-z.json'),
  'grade-demo-high-income':   safeRequire('./persona-content/grade-demo-high-income.json'),
  'grade-demo-low-income':    safeRequire('./persona-content/grade-demo-low-income.json'),
  'grade-demo-middle-income': safeRequire('./persona-content/grade-demo-middle-income.json'),
  'grade-demo-millennial':    safeRequire('./persona-content/grade-demo-millennial.json'),
  'grade-demo-multi-gen':     safeRequire('./persona-content/grade-demo-multi-gen.json'),
  'grade-demo-rural':         safeRequire('./persona-content/grade-demo-rural.json'),
  'grade-demo-single':        safeRequire('./persona-content/grade-demo-single.json'),
  'grade-demo-suburban':      safeRequire('./persona-content/grade-demo-suburban.json'),
  'grade-demo-upper-middle':  safeRequire('./persona-content/grade-demo-upper-middle.json'),
  'grade-demo-urban':         safeRequire('./persona-content/grade-demo-urban.json'),

  // Grade - Lifestyle
  'grade-lifestyle-active':             safeRequire('./persona-content/grade-lifestyle-active.json'),
  'grade-lifestyle-creative':           safeRequire('./persona-content/grade-lifestyle-creative.json'),
  'grade-lifestyle-eco':                safeRequire('./persona-content/grade-lifestyle-eco.json'),
  'grade-lifestyle-empty-nester':       safeRequire('./persona-content/grade-lifestyle-empty-nester.json'),
  'grade-lifestyle-family':             safeRequire('./persona-content/grade-lifestyle-family.json'),
  'grade-lifestyle-luxury':             safeRequire('./persona-content/grade-lifestyle-luxury.json'),
  'grade-lifestyle-outdoors':           safeRequire('./persona-content/grade-lifestyle-outdoors.json'),
  'grade-lifestyle-retiree':            safeRequire('./persona-content/grade-lifestyle-retiree.json'),
  'grade-lifestyle-student':            safeRequire('./persona-content/grade-lifestyle-student.json'),
  'grade-lifestyle-tech':               safeRequire('./persona-content/grade-lifestyle-tech.json'),
  'grade-lifestyle-value':              safeRequire('./persona-content/grade-lifestyle-value.json'),
  'grade-lifestyle-young-professional': safeRequire('./persona-content/grade-lifestyle-young-professional.json'),

  // Grade - Psychographic
  'grade-psycho-cautious':         safeRequire('./persona-content/grade-psycho-cautious.json'),
  'grade-psycho-convenience':      safeRequire('./persona-content/grade-psycho-convenience.json'),
  'grade-psycho-health-conscious': safeRequire('./persona-content/grade-psycho-health-conscious.json'),
  'grade-psycho-independent':      safeRequire('./persona-content/grade-psycho-independent.json'),
  'grade-psycho-innovator':        safeRequire('./persona-content/grade-psycho-innovator.json'),
  'grade-psycho-pragmatic':        safeRequire('./persona-content/grade-psycho-pragmatic.json'),
  'grade-psycho-price':            safeRequire('./persona-content/grade-psycho-price.json'),
  'grade-psycho-progressive':      safeRequire('./persona-content/grade-psycho-progressive.json'),
  'grade-psycho-quality':          safeRequire('./persona-content/grade-psycho-quality.json'),
  'grade-psycho-social':           safeRequire('./persona-content/grade-psycho-social.json'),
  'grade-psycho-spiritual':        safeRequire('./persona-content/grade-psycho-spiritual.json'),
  'grade-psycho-status-seeking':   safeRequire('./persona-content/grade-psycho-status-seeking.json'),
  'grade-psycho-traditional':      safeRequire('./persona-content/grade-psycho-traditional.json'),
};

function getPersonaContent(personaId) {
  const content = personaContentMap[personaId];
  if (content) return content;
  console.warn(`[PersonaContentData] Persona not found: ${personaId}`);
  return {
    id: personaId,
    name: personaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'No description available',
    context: 'Standard persona context',
  };
}

function getAllPersonaIds() {
  return Object.keys(personaContentMap);
}

function hasPersonaContent(personaId) {
  return personaContentMap[personaId] != null;
}

module.exports = { personaContentMap, getPersonaContent, getAllPersonaIds, hasPersonaContent };