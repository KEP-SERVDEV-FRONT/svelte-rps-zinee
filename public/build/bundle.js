
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.4' }, detail)));
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

    /* src\components\matching-cards\Matching-Cards.svelte generated by Svelte v3.29.4 */

    const file = "src\\components\\matching-cards\\Matching-Cards.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1vp3qgo-style";
    	style.textContent = ".container.svelte-1vp3qgo{display:flex;flex-direction:column;min-height:100vh}.card-wrap.svelte-1vp3qgo{display:flex;flex-wrap:wrap;justify-content:space-between;margin:auto;width:400px;height:200px}.card-item.svelte-1vp3qgo{display:block;width:calc(25% -5px);height:calc(50% - 10px);background-color:#222}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWF0Y2hpbmctQ2FyZHMuc3ZlbHRlIiwic291cmNlcyI6WyJNYXRjaGluZy1DYXJkcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgPGRpdiBjbGFzcz1cImNhcmQtd3JhcFwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkLWl0ZW1cIj57eyBuIH19PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtaXRlbVwiPnt7IG4gfX08L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1pdGVtXCI+e3sgbiB9fTwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkLWl0ZW1cIj57eyBuIH19PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtaXRlbVwiPnt7IG4gfX08L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1pdGVtXCI+e3sgbiB9fTwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkLWl0ZW1cIj57eyBuIH19PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtaXRlbVwiPnt7IG4gfX08L2Rpdj5cclxuICAgIDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzY3JpcHQ+XHJcbiAgICBsZXQgbiA9IDA7XHJcblxyXG48L3NjcmlwdD5cclxuXHJcbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5jb250YWluZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBtaW4taGVpZ2h0OiAxMDB2aDtcbn1cblxuLmNhcmQtd3JhcCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtd3JhcDogd3JhcDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICBtYXJnaW46IGF1dG87XG4gIHdpZHRoOiA0MDBweDtcbiAgaGVpZ2h0OiAyMDBweDtcbn1cblxuLmNhcmQtaXRlbSB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICB3aWR0aDogY2FsYygyNSUgLTVweCk7XG4gIGhlaWdodDogY2FsYyg1MCUgLSAxMHB4KTtcbiAgYmFja2dyb3VuZC1jb2xvcjogIzIyMjtcbn08L3N0eWxlPlxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0JtQixVQUFVLGVBQUMsQ0FBQyxBQUM3QixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLFVBQVUsQ0FBRSxLQUFLLEFBQ25CLENBQUMsQUFFRCxVQUFVLGVBQUMsQ0FBQyxBQUNWLE9BQU8sQ0FBRSxJQUFJLENBQ2IsU0FBUyxDQUFFLElBQUksQ0FDZixlQUFlLENBQUUsYUFBYSxDQUM5QixNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLEtBQUssQUFDZixDQUFDLEFBRUQsVUFBVSxlQUFDLENBQUMsQUFDVixPQUFPLENBQUUsS0FBSyxDQUNkLEtBQUssQ0FBRSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FDckIsTUFBTSxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDeEIsZ0JBQWdCLENBQUUsSUFBSSxBQUN4QixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let div9;
    	let div8;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div3;
    	let t7;
    	let div4;
    	let t9;
    	let div5;
    	let t11;
    	let div6;
    	let t13;
    	let div7;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div0 = element("div");
    			div0.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t7 = space();
    			div4 = element("div");
    			div4.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t9 = space();
    			div5 = element("div");
    			div5.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t11 = space();
    			div6 = element("div");
    			div6.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			t13 = space();
    			div7 = element("div");
    			div7.textContent = `${{ n: /*n*/ ctx[0] }}`;
    			attr_dev(div0, "class", "card-item svelte-1vp3qgo");
    			add_location(div0, file, 2, 8, 62);
    			attr_dev(div1, "class", "card-item svelte-1vp3qgo");
    			add_location(div1, file, 3, 8, 108);
    			attr_dev(div2, "class", "card-item svelte-1vp3qgo");
    			add_location(div2, file, 4, 8, 154);
    			attr_dev(div3, "class", "card-item svelte-1vp3qgo");
    			add_location(div3, file, 5, 8, 200);
    			attr_dev(div4, "class", "card-item svelte-1vp3qgo");
    			add_location(div4, file, 6, 8, 246);
    			attr_dev(div5, "class", "card-item svelte-1vp3qgo");
    			add_location(div5, file, 7, 8, 292);
    			attr_dev(div6, "class", "card-item svelte-1vp3qgo");
    			add_location(div6, file, 8, 8, 338);
    			attr_dev(div7, "class", "card-item svelte-1vp3qgo");
    			add_location(div7, file, 9, 8, 384);
    			attr_dev(div8, "class", "card-wrap svelte-1vp3qgo");
    			add_location(div8, file, 1, 4, 29);
    			attr_dev(div9, "class", "container svelte-1vp3qgo");
    			add_location(div9, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div0);
    			append_dev(div8, t1);
    			append_dev(div8, div1);
    			append_dev(div8, t3);
    			append_dev(div8, div2);
    			append_dev(div8, t5);
    			append_dev(div8, div3);
    			append_dev(div8, t7);
    			append_dev(div8, div4);
    			append_dev(div8, t9);
    			append_dev(div8, div5);
    			append_dev(div8, t11);
    			append_dev(div8, div6);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
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
    	validate_slots("Matching_Cards", slots, []);
    	let n = 0;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Matching_Cards> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ n });

    	$$self.$inject_state = $$props => {
    		if ("n" in $$props) $$invalidate(0, n = $$props.n);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [n];
    }

    class Matching_Cards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1vp3qgo-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Matching_Cards",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.29.4 */

    function create_fragment$1(ctx) {
    	let matchingcard;
    	let current;
    	matchingcard = new Matching_Cards({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(matchingcard.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(matchingcard, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(matchingcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(matchingcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(matchingcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ MatchingCard: Matching_Cards });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
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

}());
//# sourceMappingURL=bundle.js.map
