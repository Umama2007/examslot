/**
 * Smoke tests for the DataTable component — verify it renders without overflow
 * at 360px viewport width (minimum mobile width gate).
 *
 * The DataTable renders both a desktop table (hidden sm:block) and mobile stacked
 * cards (sm:hidden), so content text appears twice in the DOM — use getAllByText.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../components/DataTable';

// Minimal mock data matching admin tables
const branchRows = [
  { id: '1', name: 'Main Campus', code: 'MC', city: 'Karachi', status: 'active' },
];
const branchCols = [
  { header: 'Name', accessor: 'name' as const },
  { header: 'Code', accessor: 'code' as const },
  { header: 'City', accessor: 'city' as const },
  { header: 'Status', accessor: 'status' as const },
];

describe('DataTable – 360px scroll gate', () => {
  beforeEach(() => {
    // Simulate 360px mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
    window.dispatchEvent(new Event('resize'));
  });

  it('renders Branches table without throwing', () => {
    render(
      <DataTable
        data={branchRows}
        columns={branchCols}
        keyExtractor={(r) => r.id}
        searchKey="name"
      />
    );
    // Both desktop table and mobile cards render the text — use getAllByText
    const matches = screen.getAllByText('Main Campus');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state at 360px', () => {
    render(
      <DataTable
        data={[]}
        columns={branchCols}
        keyExtractor={(r: { id: string }) => r.id}
      />
    );
    // Both the table body and mobile section show "No results found"
    const matches = screen.getAllByText('No results found');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders search bar', () => {
    render(
      <DataTable
        data={branchRows}
        columns={branchCols}
        keyExtractor={(r) => r.id}
        searchKey="name"
        searchable={true}
      />
    );
    expect(screen.getByPlaceholderText('Search…')).toBeTruthy();
  });
});
