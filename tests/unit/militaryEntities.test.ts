/**
 * Unit Tests: Military Entities & Platform Extraction
 * Tests recognition and classification of Indian Armed Forces platforms, missiles, and strategic systems.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { extractMilitaryEntities, KNOWN_MILITARY_ENTITIES } from '../../src/data/militaryEntities.js';

describe('Military Entities Registry & Domain Mapping', () => {
  it('exports a comprehensive registry of at least 35 military entities', () => {
    expect(KNOWN_MILITARY_ENTITIES.length).toBeGreaterThanOrEqual(35);
  });

  it('extracts Air Force platforms, missiles, and radars correctly', () => {
    const text1 = 'IAF carries out successful test firing of Astra Mk2 BVR missile from Su-30MKI fighter';
    const res1 = extractMilitaryEntities(text1);
    expect(res1.entities).toContain('Astra BVR');
    expect(res1.entities).toContain('Su-30MKI');
    expect(res1.categories).toContain('airforce');
    expect(res1.categories).toContain('tech');

    const text2 = 'Netra AEW&C aircraft tracks airspace along western border';
    const res2 = extractMilitaryEntities(text2);
    expect(res2.entities).toContain('Netra AEW&C');
    expect(res2.categories).toContain('airforce');

    const text3 = 'Airbus and TASL deliver new C-295 transport aircraft to IAF squadron';
    const res3 = extractMilitaryEntities(text3);
    expect(res3.entities).toContain('C-295');
    expect(res3.categories).toContain('airforce');

    const text4 = 'DRDO conducts maiden taxi trials for Ghatak stealth UCAV demonstrator';
    const res4 = extractMilitaryEntities(text4);
    expect(res4.entities).toContain('Ghatak UCAV');
    expect(res4.entities).toContain('DRDO');

    const text5 = 'DRDO Tapas-BH-201 MALE UAV achieves endurance flight milestone';
    const res5 = extractMilitaryEntities(text5);
    expect(res5.entities).toContain('Tapas UAV');
  });

  it('extracts Navy warships, submarines, and underwater weapon platforms', () => {
    const text1 = 'Indian Navy commissions Project 15B stealth guided-missile destroyer INS Surat';
    const res1 = extractMilitaryEntities(text1);
    expect(res1.entities).toContain('Project 15B');
    expect(res1.categories).toContain('navy');

    const text2 = 'Mazagon Dock delivers seventh Kalvari-class Scorpene submarine to Navy';
    const res2 = extractMilitaryEntities(text2);
    expect(res2.entities).toContain('Kalvari-class');
    expect(res2.categories).toContain('navy');

    const text3 = 'Project 17A Nilgiri-class stealth frigate undergoes advanced weapon sea trials';
    const res3 = extractMilitaryEntities(text3);
    expect(res3.entities).toContain('Project 17A');
    expect(res3.categories).toContain('navy');

    const text4 = 'INS Arihant conducts successful deterrence patrol in northern Indian Ocean';
    const res4 = extractMilitaryEntities(text4);
    expect(res4.entities).toContain('INS Arihant');
    expect(res4.categories).toContain('navy');
    expect(res4.categories).toContain('strategic');

    const text5 = 'Navy test-fires Varunastra heavyweight anti-submarine torpedo from frontline destroyer';
    const res5 = extractMilitaryEntities(text5);
    expect(res5.entities).toContain('Varunastra');
    expect(res5.categories).toContain('navy');
  });

  it('extracts Army artillery, combat vehicles, and tactical air defense systems', () => {
    const text1 = 'Indian Army begins user trials of ATAGS 155mm howitzer in high-altitude desert';
    const res1 = extractMilitaryEntities(text1);
    expect(res1.entities).toContain('ATAGS');
    expect(res1.categories).toContain('army');

    const text2 = 'Armoured Corps inducts upgraded Arjun Mk-1A main battle tanks';
    const res2 = extractMilitaryEntities(text2);
    expect(res2.entities).toContain('Arjun Mk-1A');
    expect(res2.categories).toContain('army');

    const text3 = 'DRDO and Tata WhAP 8x8 armoured platform deployed along northern borders';
    const res3 = extractMilitaryEntities(text3);
    expect(res3.entities).toContain('WhAP');
    expect(res3.categories).toContain('army');

    const text4 = 'Helina anti-tank guided missile successfully validated from Rudra helicopter';
    const res4 = extractMilitaryEntities(text4);
    expect(res4.entities).toContain('Helina / Nag');
    expect(res4.entities).toContain('Rudra / ALH');

    const text5 = 'QRSAM air defense missile system achieves direct hit in salvo trials';
    const res5 = extractMilitaryEntities(text5);
    expect(res5.entities).toContain('QRSAM');
    expect(res5.categories).toContain('army');
  });

  it('extracts Strategic & Ballistic Missile Defence platforms', () => {
    const text1 = 'Strategic Forces Command test-fires MIRV-capable Agni-V ICBM with 5000km range';
    const res1 = extractMilitaryEntities(text1);
    expect(res1.entities).toContain('Agni-V');
    expect(res1.categories).toContain('strategic');

    const text2 = 'Pralay quasi-ballistic missile cleared for deployment along LAC';
    const res2 = extractMilitaryEntities(text2);
    expect(res2.entities).toContain('Pralay');
    expect(res2.categories).toContain('strategic');

    const text3 = 'DRDO validates AD-1 Phase-II Ballistic Missile Defence interceptor';
    const res3 = extractMilitaryEntities(text3);
    expect(res3.entities).toContain('Phase-II BMD');
    expect(res3.categories).toContain('strategic');

    const text4 = 'Project Kusha long-range air defence system prototype clears design review';
    const res4 = extractMilitaryEntities(text4);
    expect(res4.entities).toContain('Project Kusha');
    expect(res4.categories).toContain('strategic');
  });
});
