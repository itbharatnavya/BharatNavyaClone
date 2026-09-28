import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { MediaFrame } from './design-system/media';

afterEach(cleanup);

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Bharat Navya platform prototype', () => {
  it('starts with the parent platform home and a single account action', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /move your next business decision forward/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /founder navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /browse bharat navya/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore companies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore jobs/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^jobs$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^join \/ sign in$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it('lets guests select public story previews and gates full playback', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /happening in ahmedabad/i })).toBeInTheDocument();
    expect(document.querySelectorAll('.update-selector > button')).toHaveLength(5);
    expect(document.querySelector('.parent-sponsored')).toHaveTextContent(/paid placement/i);

    await user.click(screen.getByRole('button', { name: /preview ledgercraft tax advisors:/i }));
    expect(screen.getByRole('heading', { name: /gst onboarding checklist/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /watch full status/i }));
    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    expect(within(dialog).getByText(/join to watch the full update from ledgercraft tax advisors/i)).toBeInTheDocument();
  });

  it('switches the homepage proof artifact with accessible controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    const recruiterControl = screen.getByRole('button', { name: /named recruiter/i });
    expect(recruiterControl).toHaveAttribute('aria-pressed', 'false');
    await user.click(recruiterControl);

    expect(recruiterControl).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: /neha iyer/i })).toBeInTheDocument();
    expect(screen.getByText(/replies to 91% of applicants/i)).toBeInTheDocument();
  });

  it('shows a rich company profile with proof, media, reviews, updates, and jobs', () => {
    window.history.replaceState({}, '', '/directory/profile');
    render(<App />);

    expect(screen.getByRole('heading', { name: /ledgercraft tax advisors/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /photos and work/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /verified reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /open roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view live update from ledgercraft/i })).toBeInTheDocument();
  });

  it('gives jobs a discovery homepage and keeps promotion after four organic listing rows', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/jobs');
    render(<App />);

    expect(screen.getByRole('heading', { name: /find work where the context is part of the opportunity/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /browse all jobs/i }));
    expect(window.location.pathname).toBe('/jobs/browse');

    const results = screen.getByRole('region', { name: /job results/i });
    const rows = Array.from(results.querySelectorAll('.job-row'));
    expect(rows).toHaveLength(18);
    expect(rows[4]).toHaveTextContent(/promoted · position 5/i);
    expect(rows[4]).toHaveTextContent(/growth marketing lead/i);
    expect(rows[4]).toHaveClass('sponsored');
  });

  it('keeps native promotion and external advertising distinct and out of protected detail routes', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/companies');
    const { unmount } = render(<App />);

    const homeAd = screen.getByRole('complementary', { name: /advertisement from opsdesk cloud/i });
    expect(within(homeAd).getByText(/^advertisement$/i)).toBeInTheDocument();
    expect(within(homeAd).getByRole('link')).toHaveAttribute('rel', expect.stringContaining('sponsored'));
    await user.click(within(homeAd).getByRole('button', { name: /why this ad/i }));
    expect(within(homeAd).getByText(/no private profile or application data was used/i)).toBeInTheDocument();

    unmount();
    window.history.replaceState({}, '', '/jobs/browse');
    const resultView = render(<App />);
    expect(document.querySelector('.job-row.sponsored')).toHaveTextContent(/promoted · position 5/i);
    expect(document.querySelector('.job-preview-rail .ds-advertisement')).toBeInTheDocument();

    resultView.unmount();
    window.history.replaceState({}, '', '/jobs/job-ops');
    render(<App />);
    expect(screen.queryByText(/^advertisement$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^sponsored$/i)).not.toBeInTheDocument();
  });

  it('reserves media space and replaces a failed image with the governed fallback', () => {
    const { container } = render(<MediaFrame src="/seed-media/missing.jpg" alt="Prototype workplace" />);
    fireEvent.error(screen.getByRole('img', { name: /prototype workplace/i }));
    expect(screen.getByText(/media unavailable/i)).toBeInTheDocument();
    expect(container.querySelector('.ds-media-frame')).toBeInTheDocument();
  });

  it('routes recognizable company and job pathways directly into filtered result workbenches', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/companies');
    const { unmount } = render(<App />);

    expect(screen.getByRole('heading', { name: /start with the work you need done/i })).toBeInTheDocument();
    expect(screen.getByText(/claimed company/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /finance, legal and compliance/i }));
    expect(window.location.pathname).toBe('/companies/browse');
    expect(screen.getByText(/^GST and compliance$/i)).toBeInTheDocument();

    unmount();
    window.history.replaceState({}, '', '/jobs');
    render(<App />);
    expect(screen.getByRole('heading', { name: /browse by the work you want to do/i })).toBeInTheDocument();
    expect(screen.getByText(/salary range/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /engineering and product/i }));
    expect(window.location.pathname).toBe('/jobs/browse');
    expect(screen.getByLabelText(/^search jobs$/i)).toHaveValue('engineer product design');
  });

  it('moves section search into the shared header without leaving the hero form interactive', async () => {
    let observerCallback: IntersectionObserverCallback | undefined;
    const OriginalObserver = globalThis.IntersectionObserver;
    class TestIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [0.08];
      constructor(callback: IntersectionObserverCallback) { observerCallback = callback; }
      observe() { return undefined; }
      unobserve() { return undefined; }
      disconnect() { return undefined; }
      takeRecords() { return []; }
    }
    globalThis.IntersectionObserver = TestIntersectionObserver as unknown as typeof IntersectionObserver;
    window.history.replaceState({}, '', '/companies');
    const { container } = render(<App />);

    expect(container.querySelector('.header-search-dock')).not.toBeInTheDocument();
    await act(async () => observerCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(container.querySelector('.header-search-dock')).toBeInTheDocument();
    expect(container.querySelector('.section-hero-search-anchor')).toHaveAttribute('inert');
    expect(container.querySelector('.section-hero-search-anchor')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('navigation', { name: /founder navigation/i })).not.toBeInTheDocument();
    const pageNavigationTrigger = screen.getByRole('button', { name: /open page navigation/i });
    await userEvent.setup().click(pageNavigationTrigger);
    const pageNavigation = screen.getByRole('navigation', { name: /page navigation/i });
    expect(within(pageNavigation).getByRole('button', { name: /^companies$/i })).toHaveAttribute('aria-current', 'page');
    await userEvent.setup().keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: /page navigation/i })).not.toBeInTheDocument();
    expect(pageNavigationTrigger).toHaveFocus();

    const filterTrigger = screen.getByRole('button', { name: /change search filters: ahmedabad/i });
    await userEvent.setup().click(filterTrigger);
    const drawer = screen.getByRole('dialog', { name: /search companies/i });
    await waitFor(() => expect(within(drawer).getByLabelText(/company or service/i)).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.setup().keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /search companies/i })).not.toBeInTheDocument();
    expect(filterTrigger).toHaveFocus();

    globalThis.IntersectionObserver = OriginalObserver;
  });

  it('requires registration for saving and supports email/password without OTP', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/jobs/browse');
    render(<App />);

    await user.click(screen.getByRole('button', { name: /save operations manager/i }));
    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    expect(within(dialog).getByText(/no phone or otp required/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/email address/i)).toHaveValue('amit@example.com');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /join bharat navya/i })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /open account menu/i })).toBeInTheDocument();
  });

  it('locks background scroll for authentication and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole('button', { name: /^join \/ sign in$/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    expect(dialog.tagName).toBe('SECTION');
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close account dialog/i })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /join bharat navya/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('traps and restores focus for the company-results filter dialog', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/companies/browse');
    render(<App />);

    const trigger = screen.getByRole('button', { name: /^filters/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /filter results/i });
    const close = within(dialog).getByRole('button', { name: /close filters/i });
    await waitFor(() => expect(close).toHaveFocus());
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');

    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: /show \d+ businesses/i })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /filter results/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('makes the company live-update viewer modal and returns focus on close', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/companies/profile/ledgercraft');
    render(<App />);

    const trigger = screen.getByRole('button', { name: /view live update from ledgercraft/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /september onboarding slots/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close live update/i })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /september onboarding slots/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps incomplete company profiles useful without broken media frames', () => {
    window.history.replaceState({}, '', '/companies/profile/rightcomply');
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /rightcomply consulting/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/this listing is unclaimed/i)).toBeInTheDocument();
    expect(screen.getByText(/no credentials submitted/i)).toBeInTheDocument();
    expect(container.querySelector('.company-cover')).not.toBeInTheDocument();
    expect(container.querySelector('.company-gallery')).not.toBeInTheDocument();
  });

  it('uses the shared modal contract for public update playback', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/updates');
    render(<App />);

    const trigger = screen.getAllByRole('button', { name: /view .* status/i })[0];
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close status/i })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('protects company workspace deep links and resumes them only after account creation', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/workspace/recruitment');
    render(<App />);

    expect(screen.getByRole('dialog', { name: /join bharat navya/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    await user.click(within(dialog).getByLabelText(/company member/i));
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /^recruitment$/i })).toBeInTheDocument());
    expect(window.location.pathname).toBe('/workspace/recruitment');
  });

  it('preserves semantic current-step state through recruiter job creation', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/workspace/recruitment/job');
    render(<App />);

    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    await user.click(within(dialog).getByLabelText(/company member/i));
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /post a role candidates can evaluate/i })).toBeInTheDocument());

    const steps = screen.getByRole('navigation', { name: /job creation steps/i });
    expect(within(steps).getByRole('button', { name: /role basics/i })).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: /save and continue/i }));
    expect(within(steps).getByRole('button', { name: /requirements/i })).toHaveAttribute('aria-current', 'step');
    expect(within(steps).getByRole('button', { name: /role basics/i })).not.toHaveAttribute('aria-current');
  });

  it('opens an authorized company workspace with recruitment and promotion modules', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^join \/ sign in$/i }));
    const dialog = screen.getByRole('dialog', { name: /join bharat navya/i });
    await user.click(within(dialog).getByLabelText(/company member/i));
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /open company workspace/i }));

    expect(screen.getByRole('heading', { name: /business home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recruitmentjobs and candidates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /promotion centreeligible native placements/i })).toBeInTheDocument();

    const accountTrigger = screen.getByRole('button', { name: /open account menu/i });
    await user.click(accountTrigger);
    expect(screen.getByRole('region', { name: /account menu/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /account menu/i })).not.toBeInTheDocument();
    expect(accountTrigger).toHaveFocus();
  });

  it('persists a semantic dark theme preference through the shell control', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes parent searches by intent and opens product homepages from navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search companies or jobs/i), 'Operations manager jobs');
    await user.click(screen.getByRole('button', { name: /search bharat navya/i }));
    expect(window.location.pathname).toBe('/jobs/browse');
    expect(screen.getByRole('region', { name: /job results/i })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Job results · Bharat Navya'));
    expect(screen.getByText('Navigated to Job results')).toHaveAttribute('aria-live', 'polite');

    await user.click(screen.getAllByRole('button', { name: /^companies$/i })[0]);
    expect(window.location.pathname).toBe('/companies');
    expect(screen.getByRole('heading', { name: /find the right company for the work ahead/i })).toBeInTheDocument();
  });

  it('publishes the governed design-system foundations, states, and page patterns', () => {
    window.history.replaceState({}, '', '/design-system');
    render(<App />);

    expect(screen.getByRole('heading', { name: /bharat navya component contract/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /foundation token groups/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^saving$/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /^disabled$/i })).toBeDisabled();
    expect(screen.getByRole('heading', { name: /approved page-composition patterns/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^admin queue$/i })).toBeInTheDocument();
    expect(screen.getByText(/raw visual values require a documented exception/i)).toBeInTheDocument();
  });

  it('demonstrates accessible governed fields, feedback, loading, and dialog behavior', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/design-system');
    render(<App />);

    expect(screen.getByLabelText(/application stage/i)).toHaveValue('review');
    expect(screen.getByLabelText(/private note/i)).toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText(/email me when the applicant replies/i)).toBeChecked();
    expect(screen.getByRole('status', { name: /loading content/i })).toHaveAttribute('aria-live', 'polite');
    const workspaceChoices = screen.getAllByRole('radio', { name: /personal|company/i });
    expect(workspaceChoices[0]).toBeChecked();
    await user.click(workspaceChoices[1]);
    expect(workspaceChoices[1]).toBeChecked();
    expect(screen.getByRole('progressbar', { name: /company profile readiness/i })).toHaveAttribute('aria-valuetext', '82 percent complete');

    const trigger = screen.getByRole('button', { name: /open dialog example/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /pause this job/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close dialog/i })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /pause this job/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
