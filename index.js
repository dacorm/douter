import locationHook from "./use-location.js";
import makeMatcher from "./matcher.js";

import {
    useRef,
    useEffect,
    useContext,
    useCallback,
    createContext,
    isValidElement,
    cloneElement,
    createElement as h
} from "./react-deps.js";

const RouterCtx = createContext({});

const buildRouter = (options = {}) => {
    return {
        hook: locationHook,
        matcher: makeMatcher()
    };
};

export const useRouter = () => {
    const globalRef = useContext(RouterCtx);

    return globalRef.v = buildRouter();
};

export const useLocation = () => {
    const router = useRouter();
    return router.hook(router);
};

export const useRoute = pattern => {
    const router = useRouter();
    const [path] = useLocation();

    return router.matcher(pattern, path);
};

export const Route = ({ path, match, component, children }) => {
    const useRouteMatch = useRoute(path);

    const [matches, params] = match || useRouteMatch;

    if (!matches) return null;

    // React-Router style `component` prop
    if (component) return h(component, { params: params });

    // support render prop or plain children
    return typeof children === "function" ? children(params) : children;
};

export const Link = props => {
    const [, navigate] = useLocation();

    const href = props.href || props.to;
    const { children, onClick } = props;

    const handleClick = useCallback(
        event => {
            // ignores the navigation when clicked using right mouse button or
            // by holding a special modifier key: ctrl, command, win, alt, shift
            if (
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey ||
                event.button !== 0
            )
                return;

            event.preventDefault();
            navigate(href);
            onClick && onClick(event);
        },
        [href, onClick, navigate]
    );

    // wraps children in `a` if needed
    const extraProps = { href, onClick: handleClick, to: null };
    const jsx = isValidElement(children) ? children : h("a", props);

    return cloneElement(jsx, extraProps);
};

export const Switch = ({ children, location }) => {
    const { matcher } = useRouter();
    const [originalLocation] = useLocation();

    // make sure the `children` prop is always an array
    // this is a bit hacky, because it returns [[]], in
    // case of an empty array, but this case should be
    // properly handled below in the loop.
    children = children && children.length ? children : [children];

    for (const element of children) {
        let match = 0;

        if (
            isValidElement(element) &&
            // we don't require an element to be of type Route,
            // but we do require it to contain a truthy `path` prop.
            // this allows to use different components that wrap Route
            // inside of a switch, for example <AnimatedRoute />.
            element.props.path &&
            (match = matcher(element.props.path, location || originalLocation))[0]
        )
            return cloneElement(element, { match });
    }

    return null;
};

export const Redirect = props => {
    const [, push] = useLocation();
    useEffect(() => push(props.href || props.to));

    return null;
};

export default useRoute;
