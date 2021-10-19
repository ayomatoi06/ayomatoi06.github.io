
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.43.0 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;
    	let t7;
    	let li3;
    	let t9;
    	let li4;
    	let t11;
    	let img0;
    	let img0_src_value;
    	let t12;
    	let p0;
    	let t14;
    	let a0;
    	let br0;
    	let t16;
    	let a1;
    	let t18;
    	let p1;
    	let t20;
    	let a2;
    	let button;
    	let t22;
    	let h2;
    	let t24;
    	let p2;
    	let t26;
    	let img1;
    	let img1_src_value;
    	let t27;
    	let img2;
    	let img2_src_value;
    	let t28;
    	let img3;
    	let img3_src_value;
    	let t29;
    	let img4;
    	let img4_src_value;
    	let t30;
    	let a3;
    	let br1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "ทำความรู้จักกับผมเล็กน้อย";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "ชื่อจริง:ธิติภาส นามสกุล:ตั้งวิญญู ชื่อเล่น:เกื้อ";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "อายุ:16ปี";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "อาชีพ:นักเรียน";
    			t7 = space();
    			li3 = element("li");
    			li3.textContent = "โรงเรียน:ไตรพัฒน์";
    			t9 = space();
    			li4 = element("li");
    			li4.textContent = "สิ่งที่ชอบ:เกม อนิเมะ";
    			t11 = space();
    			img0 = element("img");
    			t12 = space();
    			p0 = element("p");
    			p0.textContent = "ผมเป็นคนที่ชอบเกมและอนิเมะค่อนข้างมาก ผมเลยมักจะชอบทำอะไรเกี่ยวกับพวกนี้อยู่บ่อยๆ ซึ่งสิ่งที่ผมทำนั้นคือการวาดรูปนั่นองครับ";
    			t14 = space();
    			a0 = element("a");
    			a0.textContent = "Anime";
    			br0 = element("br");
    			t16 = space();
    			a1 = element("a");
    			a1.textContent = "Game";
    			t18 = space();
    			p1 = element("p");
    			p1.textContent = "IGของผม";
    			t20 = space();
    			a2 = element("a");
    			button = element("button");
    			button.textContent = `${/*name*/ ctx[0]}`;
    			t22 = space();
    			h2 = element("h2");
    			h2.textContent = "ผลงานของผม";
    			t24 = space();
    			p2 = element("p");
    			p2.textContent = "ผลงานส่วนใหญ่ของผมจะเป็นศิลปะครับ";
    			t26 = space();
    			img1 = element("img");
    			t27 = space();
    			img2 = element("img");
    			t28 = space();
    			img3 = element("img");
    			t29 = space();
    			img4 = element("img");
    			t30 = space();
    			a3 = element("a");
    			a3.textContent = ">>Google";
    			br1 = element("br");
    			attr_dev(h1, "class", "svelte-66l5qd");
    			add_location(h1, file, 4, 1, 53);
    			add_location(li0, file, 6, 2, 96);
    			add_location(li1, file, 7, 2, 157);
    			add_location(li2, file, 8, 2, 178);
    			add_location(li3, file, 9, 2, 204);
    			add_location(li4, file, 10, 2, 233);
    			attr_dev(ul, "class", "svelte-66l5qd");
    			add_location(ul, file, 5, 1, 89);
    			if (!src_url_equal(img0.src, img0_src_value = "i\\5.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "width", "500");
    			add_location(img0, file, 13, 1, 274);
    			attr_dev(p0, "class", "svelte-66l5qd");
    			add_location(p0, file, 14, 1, 308);
    			attr_dev(a0, "href", "https://wiki.anime-os.com/");
    			attr_dev(a0, "class", "svelte-66l5qd");
    			add_location(a0, file, 15, 1, 440);
    			add_location(br0, file, 15, 47, 486);
    			attr_dev(a1, "href", "https://th.wikipedia.org/wiki/%E0%B8%A7%E0%B8%B4%E0%B8%94%E0%B8%B5%E0%B9%82%E0%B8%AD%E0%B9%80%E0%B8%81%E0%B8%A1");
    			attr_dev(a1, "class", "svelte-66l5qd");
    			add_location(a1, file, 16, 1, 492);
    			attr_dev(p1, "class", "svelte-66l5qd");
    			add_location(p1, file, 17, 1, 624);
    			add_location(button, file, 18, 65, 704);
    			attr_dev(a2, "href", "https://instagram.com/ayomatoi06?utm_medium=copy_link");
    			attr_dev(a2, "class", "svelte-66l5qd");
    			add_location(a2, file, 18, 1, 640);
    			attr_dev(h2, "class", "svelte-66l5qd");
    			add_location(h2, file, 19, 1, 733);
    			attr_dev(p2, "class", "svelte-66l5qd");
    			add_location(p2, file, 20, 1, 754);
    			if (!src_url_equal(img1.src, img1_src_value = "i\\1.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "width", "500");
    			add_location(img1, file, 21, 1, 796);
    			if (!src_url_equal(img2.src, img2_src_value = "i\\2.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "width", "500");
    			add_location(img2, file, 22, 1, 830);
    			if (!src_url_equal(img3.src, img3_src_value = "i\\3.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "width", "500");
    			add_location(img3, file, 23, 1, 863);
    			if (!src_url_equal(img4.src, img4_src_value = "i\\4.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "width", "500");
    			add_location(img4, file, 24, 1, 896);
    			add_location(main, file, 3, 0, 45);
    			attr_dev(a3, "href", "https://www.google.co.th/?hl=th&safe=active&ssui=on");
    			attr_dev(a3, "class", "svelte-66l5qd");
    			add_location(a3, file, 48, 0, 1198);
    			add_location(br1, file, 48, 74, 1272);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(ul, t7);
    			append_dev(ul, li3);
    			append_dev(ul, t9);
    			append_dev(ul, li4);
    			append_dev(main, t11);
    			append_dev(main, img0);
    			append_dev(main, t12);
    			append_dev(main, p0);
    			append_dev(main, t14);
    			append_dev(main, a0);
    			append_dev(main, br0);
    			append_dev(main, t16);
    			append_dev(main, a1);
    			append_dev(main, t18);
    			append_dev(main, p1);
    			append_dev(main, t20);
    			append_dev(main, a2);
    			append_dev(a2, button);
    			append_dev(main, t22);
    			append_dev(main, h2);
    			append_dev(main, t24);
    			append_dev(main, p2);
    			append_dev(main, t26);
    			append_dev(main, img1);
    			append_dev(main, t27);
    			append_dev(main, img2);
    			append_dev(main, t28);
    			append_dev(main, img3);
    			append_dev(main, t29);
    			append_dev(main, img4);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, a3, anchor);
    			insert_dev(target, br1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(a3);
    			if (detaching) detach_dev(br1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let name = 'instagram';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
