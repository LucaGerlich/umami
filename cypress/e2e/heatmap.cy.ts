describe('Heatmap page', () => {
  Cypress.session.clearAllSavedSessions();

  let websiteId: string;

  before(() => {
    cy.login(Cypress.env('umami_user'), Cypress.env('umami_password'));
    cy.addWebsite('Heatmap test site', 'heatmaptest.com').then((id: string) => {
      websiteId = id;
    });
  });

  beforeEach(() => {
    cy.login(Cypress.env('umami_user'), Cypress.env('umami_password'));
  });

  after(() => {
    if (websiteId) {
      cy.deleteWebsite(websiteId);
    }
  });

  it('renders the heatmap tab in the website navigation', () => {
    cy.visit(`/websites/${websiteId}`);
    cy.contains('Heatmap').should('be.visible');
  });

  it('navigates to the heatmap page', () => {
    cy.visit(`/websites/${websiteId}/heatmap`);
    cy.url().should('include', '/heatmap');
  });

  it('shows empty state when no heatmap data is available', () => {
    cy.visit(`/websites/${websiteId}/heatmap`);
    // The page should render — either an empty placeholder or controls
    cy.get('main').should('exist');
    // With no heatmap data collected, an empty placeholder should appear
    cy.contains(/no heatmap data/i).should('be.visible');
  });

  it('shows the heatmap legend when data controls are visible', () => {
    // Intercept the API and return mock data so we don't need a real DB
    cy.intercept('GET', `/api/websites/${websiteId}/heatmap/pages*`, {
      statusCode: 200,
      body: [{ urlPath: '/home', count: 42 }],
    }).as('heatmapPages');

    cy.intercept('GET', `/api/websites/${websiteId}/heatmap*`, {
      statusCode: 200,
      body: [{ x: 5000, y: 3000, count: 10 }],
    }).as('heatmapData');

    cy.visit(`/websites/${websiteId}/heatmap`);
    cy.wait('@heatmapPages');

    // Controls and legend should be visible
    cy.contains('Low').should('be.visible');
    cy.contains('High').should('be.visible');
  });

  it('allows selecting event type filter', () => {
    cy.intercept('GET', `/api/websites/${websiteId}/heatmap/pages*`, {
      statusCode: 200,
      body: [{ urlPath: '/home', count: 42 }],
    }).as('heatmapPages');

    cy.intercept('GET', `/api/websites/${websiteId}/heatmap*`, {
      statusCode: 200,
      body: [],
    }).as('heatmapData');

    cy.visit(`/websites/${websiteId}/heatmap`);
    cy.wait('@heatmapPages');

    // The type select should be present
    cy.contains('Clicks').should('be.visible');
  });
});
