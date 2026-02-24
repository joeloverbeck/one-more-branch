import {
  buildInventorySection,
  buildHealthSection,
} from '../../../../../../src/llm/prompts/sections/shared/resource-state-sections';

describe('buildInventorySection', () => {
  it('returns empty string when inventory is empty', () => {
    expect(buildInventorySection([])).toBe('');
  });

  it('renders inventory items with IDs', () => {
    const inventory = [
      { id: 'inv-1', text: 'Iron sword' },
      { id: 'inv-2', text: 'Healing potion' },
    ];

    const result = buildInventorySection(inventory);

    expect(result).toContain('YOUR INVENTORY:');
    expect(result).toContain('- [inv-1] Iron sword');
    expect(result).toContain('- [inv-2] Healing potion');
  });

  it('renders single inventory item', () => {
    const inventory = [{ id: 'inv-1', text: 'Map fragment' }];

    const result = buildInventorySection(inventory);

    expect(result).toContain('YOUR INVENTORY:');
    expect(result).toContain('- [inv-1] Map fragment');
  });
});

describe('buildHealthSection', () => {
  it('returns empty string when health is empty', () => {
    expect(buildHealthSection([])).toBe('');
  });

  it('renders health conditions with IDs', () => {
    const health = [
      { id: 'hp-1', text: 'Broken arm' },
      { id: 'hp-2', text: 'Mild concussion' },
    ];

    const result = buildHealthSection(health);

    expect(result).toContain('YOUR HEALTH:');
    expect(result).toContain('- [hp-1] Broken arm');
    expect(result).toContain('- [hp-2] Mild concussion');
  });

  it('renders single health condition', () => {
    const health = [{ id: 'hp-1', text: 'Poisoned' }];

    const result = buildHealthSection(health);

    expect(result).toContain('YOUR HEALTH:');
    expect(result).toContain('- [hp-1] Poisoned');
  });
});
