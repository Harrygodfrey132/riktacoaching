---
title: "GAD-7 Anxiety"
translationKey: "gad7-anxiety"
draft: false
layout: "none"
type: "none"
meta_title: "Anxiety Test (GAD-7) | Online Screening"
meta_keywords: "GAD-7, anxiety test, anxiety screening, generalized anxiety disorder"
meta_description: "Take the GAD-7 anxiety self-assessment and see your total score. Screening only."
og_title: "GAD-7 Anxiety"
og_description: "A validated 7-item anxiety screening questionnaire."
---

{{< rawhtml >}}
<section class="adhd-screening">
  <div class="adhd-screening__container">
    <header class="adhd-screening__header">
      <span class="adhd-screening__eyebrow">Self-assessment</span>
      <h1>GAD-7 Anxiety</h1>
      <p>Over the last two weeks, how often have you been bothered by the following problems?</p>
    </header>
    <div class="adhd-screening__shell">
      <div aria-hidden="true" class="adhd-screening__glow"></div>
      <form class="adhd-screening__card" id="gad7-screening-form" data-locale="en">
        <fieldset class="adhd-section">
          <legend>Questions</legend>
          <ol class="adhd-question-list">
            <li class="adhd-question">
              <div class="adhd-question__prompt">Feeling nervous, anxious, or on edge</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q1" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q1" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q1" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q1" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Not being able to stop or control worrying</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q2" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q2" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q2" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q2" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Worrying too much about different things</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q3" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q3" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q3" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q3" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Trouble relaxing</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q4" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q4" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q4" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q4" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Being so restless that it is hard to sit still</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q5" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q5" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q5" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q5" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Becoming easily annoyed or irritable</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q6" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q6" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q6" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q6" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
            <li class="adhd-question">
              <div class="adhd-question__prompt">Feeling afraid, as if something awful might happen</div>
              <div class="adhd-response-group">
                <label class="adhd-response"><input type="radio" name="q7" value="0" required><span>Not at all</span></label>
                <label class="adhd-response"><input type="radio" name="q7" value="1"><span>Several days</span></label>
                <label class="adhd-response"><input type="radio" name="q7" value="2"><span>More than half the days</span></label>
                <label class="adhd-response"><input type="radio" name="q7" value="3"><span>Nearly every day</span></label>
              </div>
            </li>
          </ol>
        </fieldset>

        <fieldset class="adhd-section">
          <legend>Functional difficulty</legend>
          <p>If you checked any problems, how difficult have these made it for you to do your work, take care of things at home, or get along with other people?</p>
          <div class="adhd-response-group">
            <label class="adhd-response"><input type="radio" name="functional" value="Not difficult at all" required><span>Not difficult at all</span></label>
            <label class="adhd-response"><input type="radio" name="functional" value="Somewhat difficult"><span>Somewhat difficult</span></label>
            <label class="adhd-response"><input type="radio" name="functional" value="Very difficult"><span>Very difficult</span></label>
            <label class="adhd-response"><input type="radio" name="functional" value="Extremely difficult"><span>Extremely difficult</span></label>
          </div>
        </fieldset>

        <div class="adhd-screening__actions">
          <button class="btn primary adhd-screening__submit" type="submit">Calculate score</button>
          <button class="btn secondary adhd-screening__reset" type="button">Clear form</button>
        </div>
        <div aria-live="polite" class="adhd-score" id="gad7-score" hidden>
          <div class="adhd-score__summary">
            <span class="adhd-score__label">Total score</span>
            <span class="adhd-score__value" id="gad7-score-value">0</span>
          </div>
          <p class="adhd-score__interpretation" id="gad7-score-interpretation">Answer all questions to see your GAD-7 score.</p>
          <div class="gad7-results" id="gad7-results"></div>
        </div>
      </form>
    </div>
  </div>
</section>

{{< /rawhtml >}}
