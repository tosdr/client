import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import Buckets from '../Buckets';

describe('Buckets', () => {
  let fakeAbove;
  let fakeBelow;
  let fakeBuckets;
  let fakeOnFocusAnnotations;
  let fakeOnScrollToClosestOffScreenAnchor;
  let fakeOnSelectAnnotations;

  beforeEach(() => {
    fakeAbove = {
      tags: new Set(['a1', 'a2']),
      position: 150,
    };
    fakeBelow = {
      tags: new Set(['b1', 'b2']),
      position: 550,
    };
    fakeBuckets = [
      {
        tags: new Set(['t1', 't2']),
        position: 250,
      },
      { tags: new Set(['t3', 't4', 't5', 't6']), position: 350 },
    ];
    fakeOnFocusAnnotations = sinon.stub();
    fakeOnScrollToClosestOffScreenAnchor = sinon.stub();
    fakeOnSelectAnnotations = sinon.stub();
  });

  const createComponent = () =>
    mount(
      <Buckets
        above={fakeAbove}
        below={fakeBelow}
        buckets={fakeBuckets}
        onFocusAnnotations={fakeOnFocusAnnotations}
        onScrollToClosestOffScreenAnchor={fakeOnScrollToClosestOffScreenAnchor}
        onSelectAnnotations={fakeOnSelectAnnotations}
      />
    );

  describe('up and down navigation', () => {
    const upButtonSelector = '[data-testid="up-navigation-button"] button';
    const downButtonSelector = '[data-testid="down-navigation-button"] button';

    it('focuses associated anchors above the screen when mouse enters the element', () => {
      const wrapper = createComponent();

      wrapper.find(upButtonSelector).simulate('mouseenter');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['a1', 'a2']);
    });

    it('focuses associated anchors below the screen when mouse enters the element', () => {
      const wrapper = createComponent();

      wrapper.find(downButtonSelector).simulate('mouseenter');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['b1', 'b2']);
    });

    it('removes focus on associated anchors above screen when mouse leaves the element', () => {
      const wrapper = createComponent();

      wrapper.find(upButtonSelector).simulate('mouseout');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('removes focus on associated anchors below screen when mouse leaves the element', () => {
      const wrapper = createComponent();

      wrapper.find(downButtonSelector).simulate('mouseout');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('focuses associated anchors above screen when the element is focused', () => {
      const wrapper = createComponent();

      wrapper.find(upButtonSelector).simulate('focus');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['a1', 'a2']);
    });

    it('focuses associated anchors below screen when the element is focused', () => {
      const wrapper = createComponent();

      wrapper.find(downButtonSelector).simulate('focus');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['b1', 'b2']);
    });

    it('removes focus on associated anchors above screen when element is blurred', () => {
      const wrapper = createComponent();

      wrapper.find(upButtonSelector).simulate('blur');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('removes focus on associated anchors below screen when element is blurred', () => {
      const wrapper = createComponent();

      wrapper.find(downButtonSelector).simulate('blur');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('renders an up navigation button if there are above-screen anchors', () => {
      const wrapper = createComponent();
      const upButton = wrapper.find(upButtonSelector);
      // The list item element wrapping the button
      const bucketItem = wrapper.find('li').first();

      assert.isTrue(upButton.exists());
      assert.equal(
        bucketItem.getDOMNode().style.top,
        `${fakeAbove.position}px`
      );
    });

    it('does not render an up navigation button if there are no above-screen anchors', () => {
      fakeAbove = { tags: new Set(), position: 150 };
      const wrapper = createComponent();
      assert.isFalse(wrapper.find(upButtonSelector).exists());
    });

    it('renders a down navigation button if there are below-screen anchors', () => {
      const wrapper = createComponent();

      const downButton = wrapper.find(downButtonSelector);
      // The list item element wrapping the button
      const bucketItem = wrapper.find('li').last();

      assert.isTrue(downButton.exists());
      assert.equal(
        bucketItem.getDOMNode().style.top,
        `${fakeBelow.position}px`
      );
    });

    it('does not render a down navigation button if there are no below-screen anchors', () => {
      fakeBelow = { tags: new Set(), position: 550 };
      const wrapper = createComponent();
      assert.isFalse(wrapper.find(downButtonSelector).exists());
    });

    it('scrolls to anchors above when up navigation button is pressed', () => {
      const wrapper = createComponent();
      const upButton = wrapper.find(upButtonSelector);

      upButton.simulate('click');

      assert.calledWith(
        fakeOnScrollToClosestOffScreenAnchor,
        ['a1', 'a2'],
        'up'
      );
    });

    it('scrolls to anchors below when down navigation button is pressed', () => {
      const wrapper = createComponent();
      const downButton = wrapper.find(downButtonSelector);

      downButton.simulate('click');

      assert.calledWith(
        fakeOnScrollToClosestOffScreenAnchor,
        ['b1', 'b2'],
        'down'
      );
    });
  });

  describe('on-screen buckets', () => {
    const bucketButtonSelector = 'button[title^="Select nearby annotations"]';
    it('renders a bucket button for each bucket', () => {
      const wrapper = createComponent();

      assert.equal(wrapper.find(bucketButtonSelector).length, 2);
    });

    it('focuses on associated annotations when mouse enters the element', () => {
      const wrapper = createComponent();

      wrapper.find(bucketButtonSelector).first().simulate('mouseenter');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['t1', 't2']);
    });

    it('removes focus on associated anchors when mouse leaves the element', () => {
      const wrapper = createComponent();

      wrapper.find(bucketButtonSelector).first().simulate('mouseout');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('focuses associated anchors when the element is focused', () => {
      const wrapper = createComponent();

      wrapper.find(bucketButtonSelector).first().simulate('focus');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, ['t1', 't2']);
    });

    it('removes focus on associated annotations when element is blurred', () => {
      const wrapper = createComponent();

      wrapper.find(bucketButtonSelector).first().simulate('blur');

      assert.calledOnce(fakeOnFocusAnnotations);
      assert.calledWith(fakeOnFocusAnnotations, []);
    });

    it('selects associated annotations when bucket button pressed', () => {
      const wrapper = createComponent();

      wrapper
        .find(bucketButtonSelector)
        .first()
        .simulate('click', { metaKey: false, ctrlKey: false });

      assert.calledOnce(fakeOnSelectAnnotations);
      const call = fakeOnSelectAnnotations.getCall(0);
      assert.deepEqual(call.args[0], [...fakeBuckets[0].tags]);
      assert.equal(call.args[1], false);
    });

    it('toggles annotation selection if metakey pressed', () => {
      const wrapper = createComponent();

      wrapper
        .find(bucketButtonSelector)
        .first()
        .simulate('click', { metaKey: true, ctrlKey: false });

      const call = fakeOnSelectAnnotations.getCall(0);

      assert.equal(call.args[1], true);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createComponent(),
      },
    ])
  );
});
