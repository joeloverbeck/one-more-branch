import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('chat-new page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/chat-new.ejs');
  const renderTemplate = renderEjs as (
    source: string,
    data: { title: string },
    options: { filename: string }
  ) => string;

  it('renders the create-chat form with all required route fields', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      { title: 'New Character Chat - One More Branch' },
      { filename: templatePath }
    );

    expect(html).toContain('id="chat-new-page"');
    expect(html).toContain('id="chat-new-form"');
    expect(html).toContain('action="/chat"');
    expect(html).toContain('method="post"');
    expect(html).toContain('data-chat-new-form');
    expect(html).toContain('name="targetCharacterId"');
    expect(html).toContain('name="interlocutorCharacterId"');
    expect(html).toContain('name="location"');
    expect(html).toContain('name="microLocation"');
    expect(html).toContain('name="timeOfDay"');
    expect(html).toContain('name="privacy"');
    expect(html).toContain('name="distanceBand"');
    expect(html).toContain('name="characterActivity"');
    expect(html).toContain('name="interactableObjects"');
    expect(html).toContain('name="ambientConditions"');
    expect(html).toContain('name="leadInSummary"');
    expect(html).toContain('name="recentEvents"');
    expect(html).toContain('name="whyNow"');
    expect(html).not.toContain('name="apiKey"');
  });

  it('renders enum options that match the current create-route contract', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      { title: 'New Character Chat - One More Branch' },
      { filename: templatePath }
    );

    expect(html).toContain('<option value="DAWN">Dawn</option>');
    expect(html).toContain('<option value="MORNING">Morning</option>');
    expect(html).toContain('<option value="MIDDAY">Midday</option>');
    expect(html).toContain('<option value="AFTERNOON">Afternoon</option>');
    expect(html).toContain('<option value="DUSK">Dusk</option>');
    expect(html).toContain('<option value="EVENING">Evening</option>');
    expect(html).toContain('<option value="LATE_NIGHT">Late Night</option>');
    expect(html).toContain('<option value="PRIVATE">Private</option>');
    expect(html).toContain('<option value="SEMI_PRIVATE">Semi-Private</option>');
    expect(html).toContain('<option value="PUBLIC">Public</option>');
    expect(html).toContain('<option value="INTIMATE">Intimate</option>');
    expect(html).toContain('<option value="ARM_REACH">Arm\'s Reach</option>');
    expect(html).toContain('<option value="CONVERSATIONAL">Conversational</option>');
    expect(html).toContain('<option value="ACROSS_ROOM">Across Room</option>');
    expect(html).toContain('<option value="DISTANT">Distant</option>');
  });
});
